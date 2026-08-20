/*
 * RAAI-AI IoT Livestock Collar
 * Board: ESP32 D1 Mini (LOLIN/Wemos)
 * Sensors: MAX30102 (heart rate) + DHT11 (Temp/Humidity)
 *
 * First boot: Captive portal for WiFi config (stored in NVS)
 * After: Deep sleep, timer wake, report vitals to server
 */

#include <WiFiManager.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>

// ===== CONFIGURATION =====
const char* SERVER_URL = "https://raii-ten.vercel.app";

// Shared secret — must match IOT_API_KEY in the server's environment
// Store it on the device via NVS (WiFiManager) in production.
const char* IOT_API_KEY = "dqtqbqse";

// Default WiFi network (hardcoded). The WiFiManager captive portal
// can still be used to change or add networks on first boot.
const char* WIFI_SSID = "OnePlus7t 5-acc";
const char* WIFI_PASSWORD = "TESTnode13";

String DEVICE_ID;

const uint64_t SLEEP_INTERVAL_SEC = 30 * 60;

// GPIO — ESP32 D1 Mini (D-pin labels in comments)
const int DHT_PIN = 19;        // D6
const int DHT_TYPE = DHT11;
const int BUTTON_PIN = 0;      // D11 (FLASH button)
const int BAT_ADC_PIN = -1;    // -1 = disabled (no voltage divider wired yet)
const int LED_PIN = 2;         // D12 — built-in LED (active LOW)

// ===== GLOBALS =====
DHT dht(DHT_PIN, DHT_TYPE);
RTC_DATA_ATTR int bootCount = 0;
RTC_DATA_ATTR bool wifiConfigured = false;

// MAX30102 registers (raw access — no external library needed)
#define MAX30102_ADDR 0x57
#define REG_INTR_ENABLE_1 0x02
#define REG_INTR_ENABLE_2 0x03
#define REG_FIFO_WR_PTR 0x04
#define REG_FIFO_RD_PTR 0x06
#define REG_FIFO_DATA 0x07
#define REG_FIFO_CONFIG 0x08
#define REG_MODE_CONFIG 0x09
#define REG_SPO2_CONFIG 0x0A
#define REG_LED1_PA 0x0C
#define REG_LED2_PA 0x0D
#define REG_PART_ID 0xFF

bool hasHeart = false;

// MAX30102 heart-rate processing state
const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
byte validBeats = 0;
unsigned long lastBeatTime = 0;
float dcFilter = 0;
float acFilter = 0;
float beatPeak = 0;
bool inPulse = false;
long lastIR = 0;
int beatAvg = 0;

// ===== HELPERS =====

float readBatteryVoltage() {
    if (BAT_ADC_PIN < 0) return 0;
    int raw = analogRead(BAT_ADC_PIN);           // 0–4095
    float voltage = (raw / 4095.0) * 3.3 * 2.0;   // voltage divider ×2
    return voltage;
}

void blinkLED(int times, int ms) {
    for (int i = 0; i < times; i++) {
        digitalWrite(LED_PIN, LOW);
        delay(ms);
        digitalWrite(LED_PIN, HIGH);
        delay(ms);
    }
}

// ===== WIFI =====

void setupWiFiManager() {
    WiFiManager wm;
    wm.setConfigPortalTimeout(180);

    DEVICE_ID = "RAAI-" + String((uint32_t)(ESP.getEfuseMac() >> 24), HEX);

    bool connected = wm.autoConnect(DEVICE_ID.c_str());
    if (!connected) {
        Serial.println("WiFiManager failed — rebooting");
        ESP.restart();
    }

    wifiConfigured = true;
    Serial.println("WiFi configured. Device ID: " + DEVICE_ID);
}

bool connectWiFi() {
    if (WiFi.status() == WL_CONNECTED) return true;

    WiFi.mode(WIFI_STA);

    // Try the configured network first
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        attempts++;
    }

    if (WiFi.status() != WL_CONNECTED) {
        // Fall back to the WiFiManager captive portal to pick/save a network
        setupWiFiManager();
    }
    return WiFi.status() == WL_CONNECTED;
}

// ===== HTTP =====

String checkPendingCommand() {
    HTTPClient http;
    String url = String(SERVER_URL) + "/api/iot/pending/" + DEVICE_ID;
    http.begin(url);
    http.addHeader("x-api-key", IOT_API_KEY);
    http.setTimeout(5000);

    int code = http.GET();
    if (code == 200) {
        String payload = http.getString();
        JsonDocument doc;
        DeserializationError err = deserializeJson(doc, payload);
        http.end();
        if (!err && doc["command"] != nullptr) {
            return doc["command"].as<String>();
        }
        return "";
    }
    http.end();
    return "";
}

bool sendReading(float temperature, int heartRate, float spo2, float battery) {
    HTTPClient http;
    String url = String(SERVER_URL) + "/api/iot/readings";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", IOT_API_KEY);
    http.setTimeout(10000);

    JsonDocument doc;
    doc["device_id"] = DEVICE_ID;
    doc["temperature"] = temperature;
    doc["heart_rate"] = heartRate;
    doc["spo2"] = spo2;
    doc["battery_level"] = battery;
    doc["rssi"] = WiFi.RSSI();

    String body;
    serializeJson(doc, body);

    int code = http.POST(body);
    http.end();
    if (code != 200) Serial.printf("  > POST /api/iot/readings -> HTTP %d\n", code);
    return code == 200;
}

// ===== SENSORS =====

bool writeReg(uint8_t reg, uint8_t val) {
    Wire.beginTransmission(MAX30102_ADDR);
    Wire.write(reg);
    Wire.write(val);
    return Wire.endTransmission() == 0;
}

bool readReg(uint8_t reg, uint8_t &val) {
    Wire.beginTransmission(MAX30102_ADDR);
    Wire.write(reg);
    if (Wire.endTransmission(false) != 0) return false;
    Wire.requestFrom((uint8_t)MAX30102_ADDR, (uint8_t)1);
    if (Wire.available()) {
        val = Wire.read();
        return true;
    }
    return false;
}

bool initHeart() {
    uint8_t id = 0;
    if (!readReg(REG_PART_ID, id) || id != 0x15) return false;
    writeReg(REG_MODE_CONFIG, 0x40);   // reset
    delay(100);
    writeReg(REG_INTR_ENABLE_1, 0x00);
    writeReg(REG_INTR_ENABLE_2, 0x00);
    writeReg(REG_FIFO_CONFIG, 0x10);
    writeReg(REG_MODE_CONFIG, 0x03);   // Red + IR
    writeReg(REG_SPO2_CONFIG, 0x67);
    writeReg(REG_LED1_PA, 0x3F);
    writeReg(REG_LED2_PA, 0x3F);
    delay(100);
    return true;
}

long readIRSample() {
    Wire.beginTransmission(MAX30102_ADDR);
    Wire.write(REG_FIFO_DATA);
    Wire.endTransmission(false);
    Wire.requestFrom((uint8_t)MAX30102_ADDR, (uint8_t)6);
    byte b[6] = {0, 0, 0, 0, 0, 0};
    for (int i = 0; i < 6; i++) {
        if (Wire.available()) b[i] = Wire.read();
    }
    return (((long)b[3] << 16) | ((long)b[4] << 8) | b[5]) & 0x3FFFFL;
}

void updateHeartProcessing(long ir, unsigned long sampleTime) {
    lastIR = ir;
    float val = (float)ir;
    if (dcFilter <= 0) dcFilter = val;
    dcFilter += (val - dcFilter) * 0.003f;
    float ac = val - dcFilter;
    acFilter += (ac - acFilter) * 0.15f;
    if (acFilter > dcFilter * 0.5f) {
        beatPeak = 0;
        inPulse = false;
    } else if (acFilter > beatPeak) {
        beatPeak = acFilter;
    }
    float thresh = (beatPeak * 0.3f > 3.0f) ? beatPeak * 0.3f : 3.0f;
    if (acFilter > thresh) {
        if (!inPulse && (sampleTime - lastBeatTime) > 250) {
            inPulse = true;
            if (lastBeatTime > 0) {
                long delta = (long)(sampleTime - lastBeatTime);
                if (delta > 300 && delta < 2000) {
                    float bpm = 60000.0f / delta;
                    if (bpm > 30 && bpm < 220) {
                        rates[rateSpot++] = (byte)bpm;
                        if (rateSpot >= RATE_SIZE) rateSpot = 0;
                        if (validBeats < RATE_SIZE) validBeats++;
                        int sum = 0;
                        for (byte j = 0; j < validBeats; j++) sum += rates[j];
                        beatAvg = sum / validBeats;
                    }
                }
            }
            lastBeatTime = sampleTime;
        }
    } else if (acFilter < thresh * 0.4f) {
        inPulse = false;
    }
    beatPeak *= 0.97f;
    if (sampleTime - lastBeatTime > 2500) {
        beatAvg = 0;
        validBeats = 0;
        beatPeak = 0;
    }
}

int readMAX30102BPM() {
    if (!hasHeart) return 0;

    const unsigned long WINDOW_MS = 15000;  // 15-second sample window
    unsigned long start = millis();

    beatAvg = 0;
    validBeats = 0;
    rateSpot = 0;
    lastBeatTime = 0;
    dcFilter = 0;
    acFilter = 0;
    beatPeak = 0;

    while (millis() - start < WINDOW_MS) {
        uint8_t wr = 0, rd = 0;
        readReg(REG_FIFO_WR_PTR, wr);
        readReg(REG_FIFO_RD_PTR, rd);
        uint8_t n = (uint8_t)((wr - rd) & 0x1F);
        unsigned long pollAt = millis();
        for (uint8_t i = 0; i < n; i++) {
            long ir = readIRSample();
            updateHeartProcessing(ir, pollAt - (unsigned long)(n - 1 - i) * 10UL);
        }
        delay(10);  // ~100 Hz polling
    }
    return beatAvg;
}

// ===== SETUP =====

void setup() {
    Serial.begin(115200);

    DEVICE_ID = "RAAI-" + String((uint32_t)(ESP.getEfuseMac() >> 24), HEX);
    Serial.println("Device ID: " + DEVICE_ID);

    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, HIGH); // off (active LOW)
    pinMode(BUTTON_PIN, INPUT_PULLUP);

    bootCount++;
    Serial.printf("Boot %d — Wake: %d\n", bootCount, esp_sleep_get_wakeup_cause());

    blinkLED(2, 100);

    // Init sensors
    dht.begin();
    Wire.begin(21, 22);
    Wire.setClock(400000);
    hasHeart = initHeart();
    Serial.println(hasHeart ? "MAX30102 detected" : "MAX30102 NOT found");

    // Connect WiFi
    if (!connectWiFi()) {
        Serial.println("WiFi failed — deep sleep");
        esp_deep_sleep_start();
        return;
    }
    Serial.println("WiFi connected: " + WiFi.SSID());

    // Pending commands
    String command = checkPendingCommand();
    bool forceReading = (command == "take_reading");

    // DHT11
    float temperature = dht.readTemperature();
    if (isnan(temperature)) temperature = 0;

    // MAX30102 (HR) — 15s sampling window, press finger firmly on the sensor
    int heartRate = readMAX30102BPM();

    // SpO2 is not computed by the raw driver
    float spo2 = 0;

    // Battery
    float battery = readBatteryVoltage();

    // Send
    bool sent = sendReading(temperature, heartRate, spo2, battery);

    Serial.printf("Sent:%s T:%.1fC HR:%d BPM Bat:%.2fV\n",
        sent ? "OK" : "FAIL", temperature, heartRate, battery);

    blinkLED(sent ? 3 : 10, 150);

    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);

    // Deep sleep — connect D0 (GPIO26) → RST for timer wake
    esp_sleep_enable_timer_wakeup(SLEEP_INTERVAL_SEC * 1000000ULL);
    esp_sleep_enable_ext0_wakeup(GPIO_NUM_0, 0);

    Serial.println("Deep sleep...");
    Serial.flush();
    esp_deep_sleep_start();
}

void loop() {}

/*
 * RAAI-AI IoT Livestock Collar
 * Board: ESP32 D1 Mini (LOLIN/Wemos)
 * Sensors: HW-036 pulse sensor (3-pin) + DHT11 (Temp/Humidity)
 *
 * First boot: Captive portal for WiFi config (stored in NVS)
 * After: Deep sleep, timer wake, report vitals to server
 */

#include <WiFiManager.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <MAX30105.h>
#include <spo2_algorithm.h>

// ===== CONFIGURATION =====
const char* SERVER_URL = "https://your-app.vercel.app";

// Shared secret — must match IOT_API_KEY in the server's environment
// Store it on the device via NVS (WiFiManager) in production.
const char* IOT_API_KEY = "change-me-to-a-random-secret";

String DEVICE_ID;

const uint64_t SLEEP_INTERVAL_SEC = 30 * 60;

// GPIO — ESP32 D1 Mini (D-pin labels in comments)
const int DHT_PIN = 19;        // D6
const int DHT_TYPE = DHT11;
const int PULSE_PIN = 36;      // A0 (HW-036 DATA pin — analog signal 0–3.3V)
const int BUTTON_PIN = 0;      // D11 (FLASH button)
const int BAT_ADC_PIN = -1;    // -1 = disabled (no voltage divider wired yet)
const int LED_PIN = 2;         // D12 — built-in LED (active LOW)

// ===== GLOBALS =====
DHT dht(DHT_PIN, DHT_TYPE);
MAX30105 max30102;
RTC_DATA_ATTR int bootCount = 0;
RTC_DATA_ATTR bool wifiConfigured = false;

uint32_t irBuffer[100];
uint32_t redBuffer[100];

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
    WiFi.begin();

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        attempts++;
    }

    if (WiFi.status() != WL_CONNECTED) {
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
    return code == 200;
}

// ===== SENSORS =====

int readPulseRate() {
    // Simple peak-detection BPM from analog pulse sensor
    const int SAMPLE_WINDOW_MS = 10000;  // 10-second sample window
    const int PEAK_THRESHOLD = 100;      // min mV swing to count as a beat
    const int MIN_BPM = 20;
    const int MAX_BPM = 300;
    const int MIN_INTERVAL_MS = (60000 / MAX_BPM);
    const int MAX_INTERVAL_MS = (60000 / MIN_BPM);

    int peak = 0;
    int trough = 4095;
    unsigned long start = millis();
    unsigned long lastBeat = 0;
    int beatCount = 0;
    unsigned long lastPeakTime = 0;
    bool rising = false;

    while (millis() - start < SAMPLE_WINDOW_MS) {
        int val = analogRead(PULSE_PIN);

        if (val > peak) peak = val;
        if (val < trough) trough = val;

        int mid = (peak + trough) / 2;
        int span = peak - trough;

        if (span > PEAK_THRESHOLD) {
            if (val > mid && !rising) {
                rising = true;
                unsigned long now = millis();
                unsigned long interval = now - lastPeakTime;

                if (lastPeakTime > 0 &&
                    interval > MIN_INTERVAL_MS &&
                    interval < MAX_INTERVAL_MS) {
                    lastBeat = now;
                    beatCount++;
                }
                lastPeakTime = now;
            } else if (val <= mid) {
                rising = false;
            }
        }

        delay(10); // ~100 Hz sample rate
    }

    if (beatCount < 2) return 0;

    float elapsedMin = SAMPLE_WINDOW_MS / 60000.0;
    int bpm = round(beatCount / elapsedMin);

    return constrain(bpm, MIN_BPM, MAX_BPM);
}

float readSpO2() {
    // Collect 100 samples from MAX30102
    int sampleCount = 0;
    for (int i = 0; i < 100; i++) {
        while (!max30102.available()) max30102.check();
        irBuffer[i] = max30102.getIR();
        redBuffer[i] = max30102.getRed();
        max30102.nextSample();
        sampleCount++;

        if (i > 10) {
            long avg = 0;
            for (int j = i - 5; j <= i; j++) avg += irBuffer[j];
            avg /= 5;
            if (avg < 50000) { sampleCount = i; break; }
        }
    }

    if (sampleCount < 10) return 0;

    int32_t spo2Value;
    int8_t validSPO2;
    int32_t heartRateValue;
    int8_t validHeartRate;

    maxim_heart_rate_and_oxygen_saturation(
        irBuffer, sampleCount, redBuffer,
        &spo2Value, &validSPO2,
        &heartRateValue, &validHeartRate
    );

    if (validSPO2 == 1) return spo2Value / 100.0;
    return 0;
}

// ===== SETUP =====

void setup() {
    Serial.begin(115200);

    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, HIGH); // off (active LOW)
    pinMode(BUTTON_PIN, INPUT_PULLUP);

    bootCount++;
    Serial.printf("Boot %d — Wake: %d\n", bootCount, esp_sleep_get_wakeup_cause());

    blinkLED(2, 100);

    // Init sensors
    dht.begin();
    Wire.begin(21, 22);
    if (max30102.begin(Wire, I2C_SPEED_FAST)) {
        max30102.setup(60, 4, 2);
    }

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

    // HW-036 pulse sensor (HR)
    int heartRate = readPulseRate();

    // MAX30102 (SpO2)
    float spo2 = readSpO2();

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

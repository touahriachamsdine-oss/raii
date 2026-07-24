/*
 * RAAI-AI IoT Livestock Collar
 * Board: Wemos D1 Mini (ESP8266)
 * Sensors: MAX30102 (HR/SpO2) + DHT11 (Temp/Humidity)
 *
 * First boot: Captive portal for WiFi config (stored in NVS)
 * After: Deep sleep (GPIO16 → RST jumper required), timer wake, report vitals
 *
 * HARDWARE SETUP:
 *   Connect D0 (GPIO16) to RST pin for deep-sleep auto-wake
 */

#include <WiFiManager.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <MAX30105.h>
#include <heartRate.h>
#include <spo2_algorithm.h>

// ===== CONFIGURATION =====
const char* SERVER_URL = "https://your-app.vercel.app";

String DEVICE_ID;

const uint64_t SLEEP_INTERVAL_SEC = 30 * 60;

// GPIO — D1 Mini pin names
const int DHT_PIN = 12;       // D6
const int DHT_TYPE = DHT11;
const int I2C_SDA = 4;        // D2
const int I2C_SCL = 5;        // D1
const int BUTTON_PIN = 0;     // D3 (FLASH button — do NOT hold at boot)
const int BAT_ADC_PIN = A0;   // A0 (0–1 V input, 10-bit)
const int LED_PIN = 2;        // D4 — built-in LED (active LOW)

// ===== GLOBALS =====
DHT dht(DHT_PIN, DHT_TYPE);
MAX30105 max30102;

uint32_t irBuffer[100];
uint32_t redBuffer[100];

// RTC memory for boot count (ESP8266 has no RTC_DATA_ATTR)
RTC_NOINIT_ATTR int rtcBootCount;
RTC_NOINIT_ATTR bool rtcWifiConfigured;

// ===== HELPERS =====

float readBatteryVoltage() {
    int raw = analogRead(BAT_ADC_PIN);         // 0–1023
    float voltage = (raw / 1023.0) * 1.0 * 2.0; // 0–1 V ADC × divider ratio
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

    DEVICE_ID = "RAAI-" + String(ESP.getChipId(), HEX);

    bool connected = wm.autoConnect(DEVICE_ID.c_str());
    if (!connected) {
        Serial.println("WiFiManager failed — rebooting");
        ESP.restart();
    }

    rtcWifiConfigured = true;
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
    WiFiClient client;
    HTTPClient http;
    String url = String(SERVER_URL) + "/api/iot/pending/" + DEVICE_ID;
    http.begin(client, url);
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
    WiFiClient client;
    HTTPClient http;
    String url = String(SERVER_URL) + "/api/iot/readings";
    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");
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

bool readMax30102(int &heartRateOut, float &spo2Out) {
    heartRateOut = 0;
    spo2Out = 0;

    int sampleCount = 0;
    for (int i = 0; i < 100; i++) {
        while (!max30102.available()) {
            max30102.check();
        }
        irBuffer[i] = max30102.getIR();
        redBuffer[i] = max30102.getRed();
        max30102.nextSample();
        sampleCount++;

        if (i > 10) {
            long avg = 0;
            for (int j = i - 5; j <= i; j++) avg += irBuffer[j];
            avg /= 5;
            if (avg < 50000) {
                sampleCount = i;
                break;
            }
        }
    }

    if (sampleCount < 10) return false;

    int32_t spo2Value;
    int8_t validSPO2;
    int32_t heartRateValue;
    int8_t validHeartRate;

    maxim_heart_rate_and_oxygen_saturation(
        irBuffer, sampleCount, redBuffer,
        &spo2Value, &validSPO2,
        &heartRateValue, &validHeartRate
    );

    if (validHeartRate == 1) heartRateOut = heartRateValue;
    if (validSPO2 == 1) spo2Out = spo2Value / 100.0;

    return (validHeartRate == 1 || validSPO2 == 1);
}

// ===== SETUP =====

void setup() {
    Serial.begin(115200);

    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, HIGH); // off (active LOW)
    pinMode(BUTTON_PIN, INPUT_PULLUP);

    rtcBootCount++;
    Serial.printf("Boot %d\n", rtcBootCount);

    blinkLED(2, 100);

    // Init sensors
    dht.begin();
    Wire.begin(I2C_SDA, I2C_SCL);
    max30102.begin(Wire, I2C_SPEED_STANDARD);
    max30102.setup(60, 4, 2);

    // Connect WiFi
    if (!connectWiFi()) {
        Serial.println("WiFi failed — deep sleep");
        ESP.deepSleep(SLEEP_INTERVAL_SEC * 1000000ULL, WAKE_RF_DEFAULT);
        return;
    }
    Serial.println("WiFi connected: " + WiFi.SSID());

    // Pending commands
    String command = checkPendingCommand();
    bool forceReading = (command == "take_reading");

    // DHT11
    float temperature = dht.readTemperature();
    if (isnan(temperature)) temperature = 0;

    // MAX30102
    int heartRate = 0;
    float spo2 = 0;
    bool sensorContact = readMax30102(heartRate, spo2);

    // Battery
    float battery = readBatteryVoltage();

    // Send
    bool sent = sendReading(temperature, heartRate, spo2, battery);

    Serial.printf("Sent:%s T:%.1fC HR:%d SpO2:%.1f%% Bat:%.2fV\n",
        sent ? "OK" : "FAIL", temperature, heartRate, spo2, battery);

    blinkLED(sent ? 3 : 10, 150);

    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);

    Serial.println("Deep sleep...");
    Serial.flush();
    ESP.deepSleep(SLEEP_INTERVAL_SEC * 1000000ULL, WAKE_RF_DEFAULT);
}

void loop() {}

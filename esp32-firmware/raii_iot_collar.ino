/*
 * RAAI-AI IoT Livestock Collar
 * Board: ESP32-C3 Mini (or any ESP32)
 * Sensors: MAX30102 (HR/SpO2) + DHT11 (Temp/Humidity)
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
#include <heartRate.h>
#include <spo2_algorithm.h>

// ===== CONFIGURATION =====
const char* SERVER_URL = "https://your-app.vercel.app";

// Default device ID uses chip MAC — unique per chip
String DEVICE_ID;

// Deep sleep interval (seconds) - default 30 minutes
const uint64_t SLEEP_INTERVAL_SEC = 30 * 60;

// GPIO pins (ESP32-C3 Mini)
const int DHT_PIN = 4;
const int DHT_TYPE = DHT11;
const int BUTTON_PIN = 0;
const int BAT_ADC_PIN = 1;
const int LED_PIN = 8;

// ===== GLOBALS =====
DHT dht(DHT_PIN, DHT_TYPE);
MAX30105 max30102;
RTC_DATA_ATTR int bootCount = 0;
RTC_DATA_ATTR bool wifiConfigured = false;

uint32_t irBuffer[100];
uint32_t redBuffer[100];

float readBatteryVoltage() {
    int raw = analogRead(BAT_ADC_PIN);
    float voltage = (raw / 4095.0) * 3.3 * 2.0;
    return voltage;
}

void setupWiFiManager() {
    WiFiManager wm;
    wm.setConfigPortalTimeout(180);

    DEVICE_ID = "ESP32-C3-" + String((uint32_t)(ESP.getEfuseMac() >> 24), HEX);

    bool connected = wm.autoConnect(("RAAI-" + DEVICE_ID).c_str());
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
        // WiFi credentials missing or changed — launch captive portal
        setupWiFiManager();
    }
    return WiFi.status() == WL_CONNECTED;
}

String checkPendingCommand() {
    HTTPClient http;
    String url = String(SERVER_URL) + "/api/iot/pending/" + DEVICE_ID;
    http.begin(url);
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

bool readMax30102(int &heartRateOut, float &spo2Out) {
    heartRateOut = 0;
    spo2Out = 0;

    // Collect 100 samples (4 seconds at 25Hz)
    int sampleCount = 0;
    for (int i = 0; i < 100; i++) {
        while (!max30102.available()) {
            max30102.check();
        }
        irBuffer[i] = max30102.getIR();
        redBuffer[i] = max30102.getRed();
        max30102.nextSample();
        sampleCount++;

        // If no finger/animal contact, IR will be very low
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

void setup() {
    Serial.begin(115200);
    pinMode(LED_PIN, OUTPUT);
    pinMode(BUTTON_PIN, INPUT_PULLUP);
    bootCount++;

    Serial.printf("Boot %d — Wake: %d\n", bootCount, esp_sleep_get_wakeup_cause());

    // Activity indication
    digitalWrite(LED_PIN, HIGH);
    delay(50);
    digitalWrite(LED_PIN, LOW);

    // Initialize sensors
    dht.begin();
    Wire.begin();
    max30102.begin(Wire, I2C_SPEED_FAST);
    max30102.setup(60, 4, 2);

    // Connect WiFi (runs captive portal on first boot or if credentials lost)
    if (!connectWiFi()) {
        Serial.println("WiFi failed — deep sleep");
        esp_deep_sleep_start();
        return;
    }
    Serial.println("WiFi connected: " + WiFi.SSID());

    // Check for pending commands
    String command = checkPendingCommand();
    bool forceReading = (command == "take_reading");

    // Read DHT11
    float temperature = dht.readTemperature();
    if (isnan(temperature)) temperature = 0;

    // Read MAX30102
    int heartRate = 0;
    float spo2 = 0;
    bool sensorContact = readMax30102(heartRate, spo2);

    // Read battery
    float battery = readBatteryVoltage();

    // Send reading
    bool sent = sendReading(temperature, heartRate, spo2, battery);

    Serial.printf("Sent:%s T:%.1fC HR:%d SpO2:%.1f%% Bat:%.2fV\n",
        sent ? "OK" : "FAIL", temperature, heartRate, spo2, battery);

    // Power down
    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);

    // Deep sleep config
    esp_sleep_enable_timer_wakeup(SLEEP_INTERVAL_SEC * 1000000ULL);
    esp_sleep_enable_ext0_wakeup(GPIO_NUM_0, 0);

    Serial.println("Deep sleep...");
    Serial.flush();
    esp_deep_sleep_start();
}

void loop() {}

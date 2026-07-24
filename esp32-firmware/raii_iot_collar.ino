/*
 * RAAI-AI IoT Livestock Collar
 * Board: ESP32-C3 Mini (or any ESP32)
 * Sensors: MAX30102 (HR/SpO2) + DHT11 (Temp/Humidity)
 *
 * Behavior:
 *   - Deep sleep most of the time
 *   - Wakes on timer (default every 30 min) or on button press
 *   - Connects to WiFi, checks for pending commands
 *   - Takes sensor readings, posts to server
 *   - Goes back to deep sleep
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <MAX30105.h>
#include <heartRate.h>

// ===== CONFIGURATION =====
const char* WIFI_SSID = "YOUR_FARM_WIFI";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

const char* SERVER_URL = "https://your-app.vercel.app";
const char* DEVICE_ID = "ESP32-C3-001";  // Unique per device - use chip ID

// Deep sleep interval (seconds) - default 30 minutes
const uint64_t SLEEP_INTERVAL_SEC = 30 * 60;

// GPIO pins
const int DHT_PIN = 4;        // DHT11 data pin
const int DHT_TYPE = DHT11;
const int BUTTON_PIN = 0;     // GPIO0 (BOOT button on most dev boards)
const int BAT_ADC_PIN = 1;    // ADC pin for battery voltage divider
const int LED_PIN = 8;        // Built-in LED on C3 Mini

// ===== GLOBALS =====
DHT dht(DHT_PIN, DHT_TYPE);
MAX30105 max30102;
RTC_DATA_ATTR int bootCount = 0;

float readBatteryVoltage() {
    int raw = analogRead(BAT_ADC_PIN);
    // Assuming voltage divider: 2 x 100kΩ (1/2 ratio)
    // ADC reference 3.3V, 12-bit (0-4095)
    float voltage = (raw / 4095.0) * 3.3 * 2.0;
    return voltage;
}

bool connectWiFi() {
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASS);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        attempts++;
    }
    return WiFi.status() == WL_CONNECTED;
}

String checkPendingCommand() {
    if (WiFi.status() != WL_CONNECTED) return "";

    HTTPClient http;
    String url = String(SERVER_URL) + "/api/iot/pending/" + String(DEVICE_ID);
    http.begin(url);
    http.setTimeout(5000);

    int code = http.GET();
    if (code == 200) {
        String payload = http.getString();
        JsonDocument doc;
        DeserializationError err = deserializeJson(doc, payload);
        if (!err && doc["command"] != nullptr) {
            String cmd = doc["command"].as<String>();
            http.end();
            return cmd;
        }
    }
    http.end();
    return "";
}

bool sendReading(float temperature, int heartRate, float spo2, float battery) {
    if (WiFi.status() != WL_CONNECTED) return false;

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

void setup() {
    Serial.begin(115200);
    pinMode(LED_PIN, OUTPUT);
    pinMode(BUTTON_PIN, INPUT_PULLUP);
    bootCount++;

    Serial.printf("Boot %d - Wake reason: %d\n", bootCount, esp_sleep_get_wakeup_cause());

    // Blink to show activity
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);

    // Connect WiFi
    if (!connectWiFi()) {
        Serial.println("WiFi failed - going back to sleep");
        esp_deep_sleep_start();
        return;
    }
    Serial.println("WiFi connected");

    // Check for pending commands
    String command = checkPendingCommand();
    bool forceReading = (command == "take_reading");

    // Initialize sensors
    dht.begin();
    Wire.begin();
    max30102.begin(Wire, I2C_SPEED_FAST);
    max30102.setup(60, 4, 2);  // LED brightness: 60, sample avg: 4, pulse width: 411

    // Read DHT11
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    if (isnan(temperature)) temperature = 0;
    if (isnan(humidity)) humidity = 0;

    // Read MAX30102 (simple HR detection)
    int heartRate = 0;
    float spo2 = 0;
    const int sampleSize = 100;
    const byte RATE_SIZE = 4;
    byte rates[RATE_SIZE];
    byte rateSpot = 0;
    long lastBeat = 0;

    float beatsPerMinute;
    int beatAvg = 0;

    for (int i = 0; i < sampleSize; i++) {
        long irValue = max30102.getIR();
        long redValue = max30102.getRed();

        if (checkForBeat(irValue)) {
            long delta = millis() - lastBeat;
            lastBeat = millis();
            beatsPerMinute = 60 / (delta / 1000.0);

            if (beatsPerMinute > 20 && beatsPerMinute < 255) {
                rates[rateSpot++] = (byte)beatsPerMinute;
                rateSpot %= RATE_SIZE;
                beatAvg = 0;
                for (byte x = 0; x < RATE_SIZE; x++) beatAvg += rates[x];
                beatAvg /= RATE_SIZE;
            }
        }

        if (irValue < 50000) {
            // No finger/animal contact - skip HR
            break;
        }

        delay(20);
    }

    if (beatAvg > 0) heartRate = beatAvg;

    // Simple SpO2 estimation (MAX30102 needs calibration)
    // This is approximate - calibrate with reference device
    spo2 = 97.0;  // Default placeholder - implement proper algorithm

    // Read battery
    float battery = readBatteryVoltage();

    // Send reading
    bool sent = sendReading(temperature, heartRate, spo2, battery);

    Serial.printf("Sent: %s | Temp: %.1f°C | HR: %d | SpO2: %.1f%% | Bat: %.2fV\n",
        sent ? "OK" : "FAIL", temperature, heartRate, spo2, battery);

    // Disconnect WiFi
    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);

    // Configure deep sleep
    esp_sleep_enable_timer_wakeup(SLEEP_INTERVAL_SEC * 1000000ULL);
    esp_sleep_enable_ext0_wakeup(GPIO_NUM_0, 0);  // Button wake (LOW)

    Serial.println("Entering deep sleep...");
    Serial.flush();
    esp_deep_sleep_start();
}

void loop() {
    // Code never reaches here
}

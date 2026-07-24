# IoT Livestock Monitoring — Design Doc

## Overview

Monitor animal vitals (temperature, heart rate, SpO2) using ESP32-C3 Mini + MAX30102 + DHT11 sensors. Each animal gets a collar-mounted device that periodically reports readings over WiFi. Farmers can trigger on-demand readings from the web dashboard.

## Architecture

```
┌──────────────────────┐       HTTP POST /api/iot/readings       ┌──────────────────────┐
│  ESP32-C3 Mini       │ ──────────────────────────────────────── │  Next.js API Route   │
│  (deep sleep 99% )   │       HTTP GET /api/iot/pending/{id}     │  → Neon DB           │
│  MAX30102 + DHT11    │ ◀────────────────────────────────────── │                      │
└──────────────────────┘                                         └──────────┬───────────┘
                                                                           │
                                                                           ▼
                                                              ┌──────────────────────┐
                                                              │  IoT Dashboard Page  │
                                                              │  (Server Component)  │
                                                              │  Animal detail view  │
                                                              └──────────────────────┘
```

## Database Tables

### iot_devices
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| device_id | TEXT UNIQUE | ESP32 chip ID / MAC |
| animal_id | UUID FK → animals.id | Linked animal |
| farm_id | UUID FK → farms.id | |
| name | TEXT | Optional label |
| battery_level | FLOAT | Last reported battery |
| last_seen_at | TIMESTAMPTZ | Last reading time |
| firmware_version | TEXT | |
| created_at | TIMESTAMPTZ | |

### iot_readings
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| device_id | TEXT FK → iot_devices.device_id | |
| animal_id | UUID FK → animals.id | Denormalized for queries |
| temperature | FLOAT | °C from DHT11 |
| heart_rate | INT | BPM from MAX30102 |
| spo2 | FLOAT | % from MAX30102 |
| battery_level | FLOAT | Voltage level |
| rssi | INT | WiFi signal strength |
| recorded_at | TIMESTAMPTZ | Sensor reading time |
| created_at | TIMESTAMPTZ | Server receive time |

### iot_pending_commands
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| device_id | TEXT | Target device |
| command | TEXT | 'take_reading' |
| status | TEXT | 'pending', 'completed' |
| created_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |

## API Endpoints

### POST /api/iot/readings
ESP32 sends sensor data. No auth required (validated by device_id existence).

Request:
```json
{
  "device_id": "ESP32-C3-ABC123",
  "temperature": 38.5,
  "heart_rate": 72,
  "spo2": 97.2,
  "battery_level": 3.7,
  "rssi": -65
}
```

Response: `{ "ok": true, "pending_command": "take_reading" | null }`

### GET /api/iot/pending/{deviceId}
ESP32 checks for pending commands. Returns first pending command or null.

## Web Pages

### /iot — IoT Dashboard (Server Component)
- List all devices with animal name, last reading, battery status
- Color indicators: green (active < 1h), yellow (1-24h), red (>24h)
- "Request Reading" button per device

### /iot/{deviceId} — Device Detail (Client Component)
- Real-time reading history chart (temperature, HR, SpO2)
- Device info, battery history
- Link to associated animal profile

## ESP32 Firmware Flow

```
Boot → Connect WiFi → GET /api/iot/pending/{id} →
  ├─ "take_reading" → Read sensors → POST /api/iot/readings → Deep sleep
  └─ null → Deep sleep (next periodic wake)

Periodic wake interval: configurable (default 30 min)
On-demand: web app inserts pending command, ESP32 picks up on next wake
```

## Implementation Order

1. DB migration (create tables)
2. API routes (readings + pending)
3. Server actions (device management, reading queries)
4. IoT dashboard page (server)
5. Device detail page (client with charts)
6. Translations
7. ESP32 firmware sketch

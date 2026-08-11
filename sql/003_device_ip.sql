-- Device IP (manually entered from the screen shown by the ESP32 on Wi-Fi connect)

ALTER TABLE iot_devices ADD COLUMN IF NOT EXISTS ip_address TEXT;
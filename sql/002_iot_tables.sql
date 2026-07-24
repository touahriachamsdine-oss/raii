-- IoT Livestock Monitoring Tables

CREATE TABLE IF NOT EXISTS iot_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT,
  battery_level FLOAT,
  last_seen_at TIMESTAMPTZ,
  firmware_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS iot_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES iot_devices(device_id) ON DELETE CASCADE,
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  temperature FLOAT,
  heart_rate INT,
  spo2 FLOAT,
  battery_level FLOAT,
  rssi INT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iot_readings_device_id ON iot_readings(device_id);
CREATE INDEX IF NOT EXISTS idx_iot_readings_animal_id ON iot_readings(animal_id);
CREATE INDEX IF NOT EXISTS idx_iot_readings_recorded_at ON iot_readings(recorded_at DESC);

CREATE TABLE IF NOT EXISTS iot_pending_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  command TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_iot_pending_device_status ON iot_pending_commands(device_id, status);

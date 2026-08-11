-- Base schema for RAAI-AI (reconstructed from application code)
-- Applied before 002_iot_tables.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id TEXT UNIQUE,
  name TEXT NOT NULL,
  country TEXT,
  locale TEXT,
  timezone TEXT,
  address TEXT,
  baladia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  family_name TEXT,
  wilaya TEXT,
  commune TEXT,
  address TEXT,
  id_card_number TEXT,
  phone_number TEXT,
  email TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'owner',
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_farms (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, farm_id)
);

CREATE TABLE IF NOT EXISTS animals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id TEXT UNIQUE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  species TEXT,
  breed TEXT,
  dob DATE,
  gender TEXT,
  status TEXT,
  purpose TEXT,
  last_pregnancy DATE,
  weight TEXT,
  monthly_production TEXT,
  sickness TEXT,
  vaccinations TEXT,
  photo_url TEXT,
  seller_name TEXT,
  farm_name TEXT,
  vaccination_due_on TIMESTAMPTZ,
  milk_yield_avg_l NUMERIC,
  last_pregnancy_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  event_type TEXT,
  description TEXT,
  date TIMESTAMPTZ,
  cost NUMERIC,
  medication TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  date TIMESTAMPTZ,
  metric_type TEXT,
  value NUMERIC,
  unit TEXT
);

CREATE TABLE IF NOT EXISTS breeding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  sire_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  event_type TEXT,
  date TIMESTAMPTZ,
  result TEXT,
  expected_due_date TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS feed_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  feed_type TEXT,
  current_quantity NUMERIC,
  unit TEXT,
  reorder_level NUMERIC,
  last_restock_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vaccination_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  vaccine_name TEXT,
  planned_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'missed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  diagnosis TEXT,
  professional_notes TEXT,
  treatment_plan TEXT,
  follow_up_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'open',
  type TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS for_sale (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id TEXT,
  species TEXT,
  breed TEXT,
  dob TEXT,
  gender TEXT,
  purpose TEXT,
  weight TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

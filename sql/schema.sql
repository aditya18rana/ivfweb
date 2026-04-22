CREATE TABLE IF NOT EXISTS clinics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  short_code TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  clinic_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  uhid TEXT NOT NULL UNIQUE,
  patient_name TEXT NOT NULL,
  age TEXT,
  dob TEXT,
  partner_name TEXT,
  partner_age TEXT,
  partner_dob TEXT,
  mobile TEXT,
  alternate_mobile TEXT,
  enquiry_source TEXT,
  address TEXT,
  state TEXT,
  city TEXT,
  marital_status TEXT,
  years_married TEXT,
  marriage_date TEXT,
  previous_children TEXT,
  child_count TEXT,
  child_details TEXT,
  consultation_for JSONB NOT NULL DEFAULT '[]'::jsonb,
  consultation_other TEXT,
  past_history TEXT,
  reference TEXT,
  referred_by TEXT,
  hospital_clinic TEXT,
  notes TEXT,
  next_follow_up_date TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  follow_ups JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_logs_clinic_id_created_at ON activity_logs(clinic_id, created_at DESC);

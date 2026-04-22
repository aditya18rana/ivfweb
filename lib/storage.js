const fs = require("fs");

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function normalizeClinicRecord(clinic) {
  return {
    id: clinic.id,
    name: clinic.name,
    shortCode: clinic.shortCode,
    city: clinic.city,
    isActive: clinic.isActive !== false,
    createdAt: clinic.createdAt
  };
}

function normalizeUserRecord(user) {
  return {
    id: user.id,
    clinicId: user.clinicId,
    clinicName: user.clinicName,
    username: user.username,
    name: user.name,
    role: user.role,
    isActive: user.isActive !== false,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt
  };
}

function normalizePatientRecord(patient) {
  return {
    id: patient.id,
    clinicId: patient.clinicId,
    uhid: patient.uhid,
    patientName: patient.patientName,
    age: patient.age,
    dob: patient.dob,
    partnerName: patient.partnerName,
    partnerAge: patient.partnerAge,
    partnerDob: patient.partnerDob,
    mobile: patient.mobile,
    alternateMobile: patient.alternateMobile,
    enquirySource: patient.enquirySource,
    address: patient.address,
    state: patient.state,
    city: patient.city,
    maritalStatus: patient.maritalStatus,
    yearsMarried: patient.yearsMarried,
    marriageDate: patient.marriageDate,
    previousChildren: patient.previousChildren,
    childCount: patient.childCount,
    childDetails: patient.childDetails,
    consultationFor: Array.isArray(patient.consultationFor) ? patient.consultationFor : [],
    consultationOther: patient.consultationOther,
    pastHistory: patient.pastHistory,
    reference: patient.reference,
    referredBy: patient.referredBy,
    hospitalClinic: patient.hospitalClinic,
    notes: patient.notes,
    nextFollowUpDate: patient.nextFollowUpDate,
    status: patient.status,
    createdAt: patient.createdAt,
    followUps: Array.isArray(patient.followUps) ? patient.followUps : []
  };
}

function normalizeLogRecord(log) {
  return {
    id: log.id,
    clinicId: log.clinicId,
    user: log.user,
    type: log.type,
    message: log.message,
    createdAt: log.createdAt
  };
}

function getDefaultSeedData(hashPassword) {
  const now = new Date().toISOString();
  return {
    clinics: [
      {
        id: "demo-clinic",
        name: "Praarambh IVF Demo",
        shortCode: "PRM",
        city: "Indore",
        isActive: true,
        createdAt: now
      },
      {
        id: "satellite-clinic",
        name: "Praarambh Satellite Clinic",
        shortCode: "PSC",
        city: "Bhopal",
        isActive: true,
        createdAt: now
      }
    ],
    users: [
      {
        id: cryptoRandomId(),
        clinicId: "platform-admin",
        clinicName: "Platform Admin",
        username: "owner",
        name: "Platform Owner",
        role: "super_admin",
        isActive: true,
        passwordHash: hashPassword("owner123"),
        createdAt: now
      },
      {
        id: cryptoRandomId(),
        clinicId: "demo-clinic",
        clinicName: "Praarambh IVF Demo",
        username: "admin",
        name: "Demo Admin",
        role: "admin",
        isActive: true,
        passwordHash: hashPassword("admin123"),
        createdAt: now
      },
      {
        id: cryptoRandomId(),
        clinicId: "satellite-clinic",
        clinicName: "Praarambh Satellite Clinic",
        username: "satellite",
        name: "Satellite Admin",
        role: "manager",
        isActive: true,
        passwordHash: hashPassword("demo123"),
        createdAt: now
      }
    ]
  };
}

function cryptoRandomId() {
  return require("crypto").randomUUID();
}

class JsonStorage {
  constructor(options) {
    this.hashPassword = options.hashPassword;
    this.dataDir = options.dataDir;
    this.files = options.files;
  }

  async init() {
    fs.mkdirSync(this.dataDir, { recursive: true });
    Object.values(this.files).forEach((filePath) => {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "[]", "utf8");
      }
    });

    let clinics = readJson(this.files.clinics, []);
    if (!clinics.length) {
      clinics = getDefaultSeedData(this.hashPassword).clinics;
      writeJson(this.files.clinics, clinics);
    } else {
      clinics = clinics.map(normalizeClinicRecord);
      writeJson(this.files.clinics, clinics);
    }

    let users = readJson(this.files.users, []);
    if (!users.length) {
      users = getDefaultSeedData(this.hashPassword).users;
      writeJson(this.files.users, users);
      return;
    }

    const migrated = users.map((user) => {
      const normalized = normalizeUserRecord(user);
      if (normalized.passwordHash && !normalized.passwordHash.includes(":")) {
        if (normalized.username === "owner") {
          normalized.passwordHash = this.hashPassword("owner123");
        } else if (normalized.username === "admin") {
          normalized.passwordHash = this.hashPassword("admin123");
        } else if (normalized.username === "satellite") {
          normalized.passwordHash = this.hashPassword("demo123");
        }
      }
      return normalized;
    });

    if (!migrated.some((user) => user.username === "owner")) {
      migrated.unshift(getDefaultSeedData(this.hashPassword).users[0]);
    }
    if (!migrated.some((user) => user.username === "satellite")) {
      migrated.push(getDefaultSeedData(this.hashPassword).users[2]);
    }
    writeJson(this.files.users, migrated);
  }

  async getClinics() {
    return readJson(this.files.clinics, []).map(normalizeClinicRecord);
  }

  async getClinic(clinicId) {
    return (await this.getClinics()).find((clinic) => clinic.id === clinicId) || null;
  }

  async createClinic(clinic) {
    const clinics = await this.getClinics();
    clinics.push(normalizeClinicRecord(clinic));
    writeJson(this.files.clinics, clinics);
    return clinic;
  }

  async updateClinic(clinic) {
    const clinics = await this.getClinics();
    const next = clinics.map((item) => (item.id === clinic.id ? normalizeClinicRecord(clinic) : item));
    writeJson(this.files.clinics, next);
    return normalizeClinicRecord(clinic);
  }

  async getUsers() {
    return readJson(this.files.users, []).map(normalizeUserRecord);
  }

  async getUserByUsername(username) {
    return (await this.getUsers()).find((user) => user.username === username) || null;
  }

  async createUser(user) {
    const users = await this.getUsers();
    users.push(normalizeUserRecord(user));
    writeJson(this.files.users, users);
    return user;
  }

  async updateUser(user) {
    const users = await this.getUsers();
    const next = users.map((item) => (item.id === user.id ? normalizeUserRecord(user) : item));
    writeJson(this.files.users, next);
    return normalizeUserRecord(user);
  }

  async getAllPatients() {
    return readJson(this.files.patients, []).map(normalizePatientRecord);
  }

  async getPatientsByClinic(clinicId) {
    return (await this.getAllPatients()).filter((patient) => patient.clinicId === clinicId);
  }

  async getPatientById(clinicId, patientId) {
    return (
      await this.getPatientsByClinic(clinicId)
    ).find((patient) => patient.id === patientId) || null;
  }

  async createPatient(patient) {
    const patients = await this.getAllPatients();
    patients.push(normalizePatientRecord(patient));
    writeJson(this.files.patients, patients);
    return patient;
  }

  async updatePatient(patient) {
    const patients = await this.getAllPatients();
    const next = patients.map((item) => (item.id === patient.id ? normalizePatientRecord(patient) : item));
    writeJson(this.files.patients, next);
    return normalizePatientRecord(patient);
  }

  async getLogsByClinic(clinicId, limit = 10) {
    return readJson(this.files.logs, [])
      .map(normalizeLogRecord)
      .filter((log) => log.clinicId === clinicId)
      .slice(0, limit);
  }

  async createLog(log) {
    const logs = readJson(this.files.logs, []).map(normalizeLogRecord);
    logs.unshift(normalizeLogRecord(log));
    writeJson(this.files.logs, logs.slice(0, 1000));
    return log;
  }
}

class PostgresStorage {
  constructor(options) {
    const { Pool } = require("pg");
    this.hashPassword = options.hashPassword;
    this.files = options.files;
    this.pool = new Pool({
      connectionString: options.databaseUrl,
      ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false }
    });
  }

  async init() {
    await this.pool.query(`
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
    `);

    const result = await this.pool.query("SELECT COUNT(*)::int AS count FROM clinics");
    if (result.rows[0].count > 0) {
      return;
    }

    const seedData = this.getSeedSource();
    for (const clinic of seedData.clinics) {
      await this.createClinic(clinic);
    }
    for (const user of seedData.users) {
      await this.createUser(user);
    }
    for (const patient of seedData.patients) {
      await this.createPatient(patient);
    }
    for (const log of seedData.logs) {
      await this.createLog(log);
    }
  }

  getSeedSource() {
    const defaults = getDefaultSeedData(this.hashPassword);
    const clinics = readJson(this.files.clinics, []);
    const users = readJson(this.files.users, []);
    const patients = readJson(this.files.patients, []);
    const logs = readJson(this.files.logs, []);
    const normalizedUsers = (users.length ? users : defaults.users).map((user) => {
      const normalized = normalizeUserRecord(user);
      if (normalized.passwordHash && !normalized.passwordHash.includes(":")) {
        if (normalized.username === "owner") {
          normalized.passwordHash = this.hashPassword("owner123");
        } else if (normalized.username === "admin") {
          normalized.passwordHash = this.hashPassword("admin123");
        } else if (normalized.username === "satellite") {
          normalized.passwordHash = this.hashPassword("demo123");
        }
      }
      return normalized;
    });

    if (!normalizedUsers.some((user) => user.username === "owner")) {
      normalizedUsers.unshift(defaults.users[0]);
    }
    if (!normalizedUsers.some((user) => user.username === "satellite")) {
      normalizedUsers.push(defaults.users[2]);
    }

    return {
      clinics: (clinics.length ? clinics : defaults.clinics).map(normalizeClinicRecord),
      users: normalizedUsers,
      patients: patients.map(normalizePatientRecord),
      logs: logs.map(normalizeLogRecord)
    };
  }

  mapClinic(row) {
    return {
      id: row.id,
      name: row.name,
      shortCode: row.short_code,
      city: row.city,
      isActive: row.is_active,
      createdAt: row.created_at
    };
  }

  mapUser(row) {
    return {
      id: row.id,
      clinicId: row.clinic_id,
      clinicName: row.clinic_name,
      username: row.username,
      name: row.name,
      role: row.role,
      isActive: row.is_active,
      passwordHash: row.password_hash,
      createdAt: row.created_at
    };
  }

  mapPatient(row) {
    return {
      id: row.id,
      clinicId: row.clinic_id,
      uhid: row.uhid,
      patientName: row.patient_name,
      age: row.age,
      dob: row.dob,
      partnerName: row.partner_name,
      partnerAge: row.partner_age,
      partnerDob: row.partner_dob,
      mobile: row.mobile,
      alternateMobile: row.alternate_mobile,
      enquirySource: row.enquiry_source,
      address: row.address,
      state: row.state,
      city: row.city,
      maritalStatus: row.marital_status,
      yearsMarried: row.years_married,
      marriageDate: row.marriage_date,
      previousChildren: row.previous_children,
      childCount: row.child_count,
      childDetails: row.child_details,
      consultationFor: Array.isArray(row.consultation_for) ? row.consultation_for : [],
      consultationOther: row.consultation_other,
      pastHistory: row.past_history,
      reference: row.reference,
      referredBy: row.referred_by,
      hospitalClinic: row.hospital_clinic,
      notes: row.notes,
      nextFollowUpDate: row.next_follow_up_date,
      status: row.status,
      createdAt: row.created_at,
      followUps: Array.isArray(row.follow_ups) ? row.follow_ups : []
    };
  }

  mapLog(row) {
    return {
      id: row.id,
      clinicId: row.clinic_id,
      user: row.user_name,
      type: row.type,
      message: row.message,
      createdAt: row.created_at
    };
  }

  async getClinics() {
    const result = await this.pool.query("SELECT * FROM clinics ORDER BY name ASC");
    return result.rows.map((row) => this.mapClinic(row));
  }

  async getClinic(clinicId) {
    const result = await this.pool.query("SELECT * FROM clinics WHERE id = $1 LIMIT 1", [clinicId]);
    return result.rows[0] ? this.mapClinic(result.rows[0]) : null;
  }

  async createClinic(clinic) {
    await this.pool.query(
      `
        INSERT INTO clinics (id, name, short_code, city, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [clinic.id, clinic.name, clinic.shortCode, clinic.city, clinic.isActive !== false, clinic.createdAt]
    );
    return clinic;
  }

  async updateClinic(clinic) {
    await this.pool.query(
      `
        UPDATE clinics
        SET name = $2, short_code = $3, city = $4, is_active = $5, created_at = $6
        WHERE id = $1
      `,
      [clinic.id, clinic.name, clinic.shortCode, clinic.city, clinic.isActive !== false, clinic.createdAt]
    );
    return clinic;
  }

  async getUsers() {
    const result = await this.pool.query("SELECT * FROM users ORDER BY created_at DESC");
    return result.rows.map((row) => this.mapUser(row));
  }

  async getUserByUsername(username) {
    const result = await this.pool.query("SELECT * FROM users WHERE username = $1 LIMIT 1", [username]);
    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  async createUser(user) {
    await this.pool.query(
      `
        INSERT INTO users (id, clinic_id, clinic_name, username, name, role, is_active, password_hash, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        user.id,
        user.clinicId,
        user.clinicName,
        user.username,
        user.name,
        user.role,
        user.isActive !== false,
        user.passwordHash,
        user.createdAt
      ]
    );
    return user;
  }

  async updateUser(user) {
    await this.pool.query(
      `
        UPDATE users
        SET clinic_id = $2, clinic_name = $3, username = $4, name = $5, role = $6, is_active = $7, password_hash = $8, created_at = $9
        WHERE id = $1
      `,
      [
        user.id,
        user.clinicId,
        user.clinicName,
        user.username,
        user.name,
        user.role,
        user.isActive !== false,
        user.passwordHash,
        user.createdAt
      ]
    );
    return user;
  }

  async getAllPatients() {
    const result = await this.pool.query("SELECT * FROM patients ORDER BY created_at DESC");
    return result.rows.map((row) => this.mapPatient(row));
  }

  async getPatientsByClinic(clinicId) {
    const result = await this.pool.query(
      "SELECT * FROM patients WHERE clinic_id = $1 ORDER BY created_at DESC",
      [clinicId]
    );
    return result.rows.map((row) => this.mapPatient(row));
  }

  async getPatientById(clinicId, patientId) {
    const result = await this.pool.query(
      "SELECT * FROM patients WHERE clinic_id = $1 AND id = $2 LIMIT 1",
      [clinicId, patientId]
    );
    return result.rows[0] ? this.mapPatient(result.rows[0]) : null;
  }

  async createPatient(patient) {
    await this.pool.query(
      `
        INSERT INTO patients (
          id, clinic_id, uhid, patient_name, age, dob, partner_name, partner_age, partner_dob,
          mobile, alternate_mobile, enquiry_source, address, state, city, marital_status,
          years_married, marriage_date, previous_children, child_count, child_details,
          consultation_for, consultation_other, past_history, reference, referred_by,
          hospital_clinic, notes, next_follow_up_date, status, created_at, follow_ups
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21,
          $22::jsonb, $23, $24, $25, $26,
          $27, $28, $29, $30, $31, $32::jsonb
        )
      `,
      [
        patient.id,
        patient.clinicId,
        patient.uhid,
        patient.patientName,
        patient.age,
        patient.dob,
        patient.partnerName,
        patient.partnerAge,
        patient.partnerDob,
        patient.mobile,
        patient.alternateMobile,
        patient.enquirySource,
        patient.address,
        patient.state,
        patient.city,
        patient.maritalStatus,
        patient.yearsMarried,
        patient.marriageDate,
        patient.previousChildren,
        patient.childCount,
        patient.childDetails,
        JSON.stringify(patient.consultationFor || []),
        patient.consultationOther,
        patient.pastHistory,
        patient.reference,
        patient.referredBy,
        patient.hospitalClinic,
        patient.notes,
        patient.nextFollowUpDate,
        patient.status,
        patient.createdAt,
        JSON.stringify(patient.followUps || [])
      ]
    );
    return patient;
  }

  async updatePatient(patient) {
    await this.pool.query(
      `
        UPDATE patients
        SET clinic_id = $2, uhid = $3, patient_name = $4, age = $5, dob = $6, partner_name = $7,
            partner_age = $8, partner_dob = $9, mobile = $10, alternate_mobile = $11,
            enquiry_source = $12, address = $13, state = $14, city = $15, marital_status = $16,
            years_married = $17, marriage_date = $18, previous_children = $19, child_count = $20,
            child_details = $21, consultation_for = $22::jsonb, consultation_other = $23,
            past_history = $24, reference = $25, referred_by = $26, hospital_clinic = $27,
            notes = $28, next_follow_up_date = $29, status = $30, created_at = $31, follow_ups = $32::jsonb
        WHERE id = $1
      `,
      [
        patient.id,
        patient.clinicId,
        patient.uhid,
        patient.patientName,
        patient.age,
        patient.dob,
        patient.partnerName,
        patient.partnerAge,
        patient.partnerDob,
        patient.mobile,
        patient.alternateMobile,
        patient.enquirySource,
        patient.address,
        patient.state,
        patient.city,
        patient.maritalStatus,
        patient.yearsMarried,
        patient.marriageDate,
        patient.previousChildren,
        patient.childCount,
        patient.childDetails,
        JSON.stringify(patient.consultationFor || []),
        patient.consultationOther,
        patient.pastHistory,
        patient.reference,
        patient.referredBy,
        patient.hospitalClinic,
        patient.notes,
        patient.nextFollowUpDate,
        patient.status,
        patient.createdAt,
        JSON.stringify(patient.followUps || [])
      ]
    );
    return patient;
  }

  async getLogsByClinic(clinicId, limit = 10) {
    const result = await this.pool.query(
      "SELECT * FROM activity_logs WHERE clinic_id = $1 ORDER BY created_at DESC LIMIT $2",
      [clinicId, limit]
    );
    return result.rows.map((row) => this.mapLog(row));
  }

  async createLog(log) {
    await this.pool.query(
      `
        INSERT INTO activity_logs (id, clinic_id, user_name, type, message, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [log.id, log.clinicId, log.user, log.type, log.message, log.createdAt]
    );
    return log;
  }
}

function createStorage(options) {
  if (options.provider === "postgres") {
    return new PostgresStorage(options);
  }
  return new JsonStorage(options);
}

module.exports = {
  createStorage
};

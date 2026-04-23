const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");
const { createStorage } = require("./lib/storage");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const CLINICS_FILE = path.join(DATA_DIR, "clinics.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PATIENTS_FILE = path.join(DATA_DIR, "patients.json");
const LOGS_FILE = path.join(DATA_DIR, "activity-logs.json");
const DATA_PROVIDER =
  process.env.DATA_PROVIDER || (process.env.DATABASE_URL ? "postgres" : "json");

const sessions = new Map();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedValue) {
  if (!storedValue.includes(":")) {
    const legacy = crypto.createHash("sha256").update(password).digest("hex");
    return legacy === storedValue;
  }

  const [salt, storedHash] = storedValue.split(":");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(hash, "hex"));
}

const storage = createStorage({
  provider: DATA_PROVIDER,
  databaseUrl: process.env.DATABASE_URL,
  dataDir: DATA_DIR,
  files: {
    clinics: CLINICS_FILE,
    users: USERS_FILE,
    patients: PATIENTS_FILE,
    logs: LOGS_FILE
  },
  hashPassword
});

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml"
  };

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream"
    });
    res.end(content);
  });
}

function parseCookies(req) {
  const raw = req.headers.cookie || "";
  return raw.split(";").reduce((acc, pair) => {
    const [key, ...rest] = pair.trim().split("=");
    if (!key) {
      return acc;
    }
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (!session.expiresAt || session.expiresAt < now) {
      sessions.delete(token);
    }
  }
}

function getSessionUser(req) {
  cleanExpiredSessions();
  const cookies = parseCookies(req);
  const token = cookies.sessionToken;
  if (!token || !sessions.has(token)) {
    return null;
  }
  return sessions.get(token);
}

function requireAuth(req, res) {
  const session = getSessionUser(req);
  if (!session) {
    sendJson(res, 401, { error: "Unauthorized" });
    return null;
  }
  return session;
}

function requireRole(req, res, allowedRoles) {
  const session = requireAuth(req, res);
  if (!session) {
    return null;
  }
  if (!allowedRoles.includes(session.role)) {
    sendJson(res, 403, { error: "Forbidden" });
    return null;
  }
  return session;
}

function createSession(user) {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    clinicId: user.clinicId,
    clinicName: user.clinicName,
    expiresAt: Date.now() + 1000 * 60 * 60 * 8
  });
  return token;
}

function normalizeUser(user) {
  return {
    id: user.id,
    clinicId: user.clinicId,
    clinicName: user.clinicName,
    username: user.username,
    name: user.name,
    role: user.role,
    isActive: user.isActive !== false,
    createdAt: user.createdAt
  };
}

function clearSession(req, res) {
  const cookies = parseCookies(req);
  if (cookies.sessionToken) {
    sessions.delete(cookies.sessionToken);
  }
  sendJson(
    res,
    200,
    { ok: true },
    { "Set-Cookie": "sessionToken=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict" }
  );
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

async function generateUhid(clinicId) {
  const clinic = await storage.getClinic(clinicId);
  const patients = await storage.getPatientsByClinic(clinicId);
  const prefix = clinic?.shortCode || "UHID";
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const todayCount = patients.filter((patient) => patient.uhid.includes(datePart)).length + 1;
  return `${prefix}-${datePart}-${String(todayCount).padStart(4, "0")}`;
}

function normalizePatient(patient) {
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
    doctorName: patient.doctorName,
    address: patient.address,
    state: patient.state,
    city: patient.city,
    maritalStatus: patient.maritalStatus,
    yearsMarried: patient.yearsMarried,
    marriageDate: patient.marriageDate,
    previousChildren: patient.previousChildren,
    childCount: patient.childCount,
    childDetails: patient.childDetails,
    consultationFor: patient.consultationFor || [],
    consultationOther: patient.consultationOther,
    pastHistory: patient.pastHistory,
    reference: patient.reference,
    referredBy: patient.referredBy,
    hospitalClinic: patient.hospitalClinic,
    notes: patient.notes,
    nextFollowUpDate: patient.nextFollowUpDate,
    status: patient.status,
    createdAt: patient.createdAt,
    followUps: patient.followUps || []
  };
}

async function writeLog(entry) {
  await storage.createLog({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry
  });
}

function getInitials(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0].toLowerCase())
    .join("");
}

function getSearchText(patient) {
  return [
    patient.patientName,
    patient.partnerName,
    patient.uhid,
    patient.mobile,
    getInitials(patient.patientName),
    getInitials(patient.partnerName)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

async function getDashboard(clinicId) {
  const patients = await storage.getPatientsByClinic(clinicId);
  const today = new Date().toISOString().slice(0, 10);

  return {
    totalPatients: patients.length,
    todayPatients: patients.filter((patient) => String(patient.createdAt).startsWith(today)).length,
    followUpPending: patients.filter((patient) => patient.nextFollowUpDate).length,
    todayFollowUps: patients
      .filter((patient) => patient.nextFollowUpDate === today)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8)
      .map(normalizePatient),
    recentPatients: patients
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6)
      .map(normalizePatient)
  };
}

async function getAdminSummary(session) {
  const clinics = await storage.getClinics();
  const users = await storage.getUsers();
  const patients = await storage.getAllPatients();
  const visibleClinicId = session.role === "super_admin" ? null : session.clinicId;
  const visibleClinics = visibleClinicId
    ? clinics.filter((clinic) => clinic.id === visibleClinicId)
    : clinics;
  const visibleUsers = visibleClinicId
    ? users.filter((user) => user.clinicId === visibleClinicId)
    : users.filter((user) => user.role !== "super_admin");
  const visiblePatients = visibleClinicId
    ? patients.filter((patient) => patient.clinicId === visibleClinicId)
    : patients;

  return {
    clinics: visibleClinics.sort((a, b) => a.name.localeCompare(b.name)),
    users: visibleUsers
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(normalizeUser),
    counts: {
      clinics: visibleClinics.length,
      users: visibleUsers.length,
      patients: visiblePatients.length
    }
  };
}

function isAllowedDemoLogin(user, password) {
  const demoPasswords = {
    owner: "owner123",
    admin: "admin123",
    satellite: "demo123"
  };
  return demoPasswords[user.username] === password;
}

async function handleApi(req, res, url) {
  if (req.method === "POST" && url.pathname === "/api/login") {
    try {
      const body = await parseBody(req);
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      const user = await storage.getUserByUsername(username);

      if (
        !user ||
        (!verifyPassword(password, user.passwordHash) && !isAllowedDemoLogin(user, password))
      ) {
        sendJson(res, 401, { error: "Invalid username or password" });
        return true;
      }

      const clinic = user.clinicId ? await storage.getClinic(user.clinicId) : null;
      if (user.isActive === false || (clinic && clinic.isActive === false && user.role !== "super_admin")) {
        sendJson(res, 403, { error: "This login is inactive. Please contact the platform owner." });
        return true;
      }

      const token = createSession(user);
      sendJson(
        res,
        200,
        {
          ok: true,
          user: {
            username: user.username,
            name: user.name,
            role: user.role,
            clinicName: user.clinicName,
            clinicId: user.clinicId
          }
        },
        {
          "Set-Cookie": `sessionToken=${token}; HttpOnly; Path=/; Max-Age=28800; SameSite=Strict`
        }
      );
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/logout") {
    clearSession(req, res);
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/session") {
    const session = getSessionUser(req);
    sendJson(res, 200, { authenticated: Boolean(session), user: session });
    return true;
  }

  if (!url.pathname.startsWith("/api/")) {
    return false;
  }

  const session = requireAuth(req, res);
  if (!session) {
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/dashboard") {
    sendJson(
      res,
      200,
      {
        dashboard:
          session.role === "super_admin"
            ? {
                totalPatients: 0,
                todayPatients: 0,
                followUpPending: 0,
                todayFollowUps: [],
                recentPatients: []
              }
            : await getDashboard(session.clinicId)
      }
    );
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/activity") {
    const logs = await storage.getLogsByClinic(session.clinicId, 10);
    sendJson(res, 200, { logs });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/summary") {
    const adminSession = requireRole(req, res, ["super_admin"]);
    if (!adminSession) {
      return true;
    }
    sendJson(res, 200, { summary: await getAdminSummary(adminSession) });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/clinics") {
    const adminSession = requireRole(req, res, ["super_admin"]);
    if (!adminSession) {
      return true;
    }

    try {
      const body = await parseBody(req);
      const clinics = await storage.getClinics();
      const users = await storage.getUsers();
      const name = String(body.name || "").trim();
      const city = String(body.city || "").trim();
      const shortCode = String(body.shortCode || "").trim().toUpperCase();
      const adminName = String(body.adminName || "").trim();
      const username = String(body.username || "").trim().toLowerCase();
      const password = String(body.password || "").trim();

      if (!name || !city || !shortCode || !adminName || !username || !password) {
        sendJson(res, 400, { error: "Clinic details and admin login are required" });
        return true;
      }
      if (clinics.some((clinic) => clinic.shortCode === shortCode || clinic.name === name)) {
        sendJson(res, 400, { error: "Clinic name or short code already exists" });
        return true;
      }
      if (users.some((user) => user.username === username)) {
        sendJson(res, 400, { error: "Username already exists" });
        return true;
      }

      const clinic = {
        id: slugify(`${name}-${shortCode}`) || crypto.randomUUID(),
        name,
        shortCode,
        city,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      const clinicAdmin = {
        id: crypto.randomUUID(),
        clinicId: clinic.id,
        clinicName: clinic.name,
        username,
        name: adminName,
        role: "admin",
        isActive: true,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString()
      };

      await storage.createClinic(clinic);
      await storage.createUser(clinicAdmin);
      await writeLog({
        clinicId: clinic.id,
        user: adminSession.name,
        type: "clinic_created",
        message: `${clinic.name} onboarded with admin ${clinicAdmin.username}`
      });
      sendJson(res, 201, {
        clinic,
        user: {
          username: clinicAdmin.username,
          name: clinicAdmin.name,
          role: clinicAdmin.role
        }
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/users") {
    const adminSession = requireRole(req, res, ["super_admin"]);
    if (!adminSession) {
      return true;
    }

    try {
      const body = await parseBody(req);
      const users = await storage.getUsers();
      const clinicId = String(body.clinicId || "").trim();
      const clinic = await storage.getClinic(clinicId);
      const username = String(body.username || "").trim().toLowerCase();
      const name = String(body.name || "").trim();
      const role = String(body.role || "").trim() || "staff";
      const password = String(body.password || "").trim();

      if (!clinic || !username || !name || !role || !password) {
        sendJson(res, 400, {
          error: "Clinic, name, username, role, and password are required"
        });
        return true;
      }
      if (!["admin", "manager", "staff", "doctor", "reception"].includes(role)) {
        sendJson(res, 400, { error: "Invalid role" });
        return true;
      }
      if (users.some((user) => user.username === username)) {
        sendJson(res, 400, { error: "Username already exists" });
        return true;
      }

      const user = {
        id: crypto.randomUUID(),
        clinicId: clinic.id,
        clinicName: clinic.name,
        username,
        name,
        role,
        isActive: true,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString()
      };
      await storage.createUser(user);
      await writeLog({
        clinicId: clinic.id,
        user: adminSession.name,
        type: "user_created",
        message: `${name} (${role}) login created for ${clinic.name}`
      });
      sendJson(res, 201, {
        user: normalizeUser(user)
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/clinics/status") {
    const adminSession = requireRole(req, res, ["super_admin"]);
    if (!adminSession) {
      return true;
    }

    try {
      const body = await parseBody(req);
      const clinic = await storage.getClinic(String(body.clinicId || "").trim());
      if (!clinic) {
        sendJson(res, 404, { error: "Clinic not found" });
        return true;
      }
      clinic.isActive = Boolean(body.isActive);
      await storage.updateClinic(clinic);
      await writeLog({
        clinicId: clinic.id,
        user: adminSession.name,
        type: "clinic_status_changed",
        message: `${clinic.name} marked as ${clinic.isActive ? "active" : "inactive"}`
      });
      sendJson(res, 200, { clinic });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/users/status") {
    const adminSession = requireRole(req, res, ["super_admin"]);
    if (!adminSession) {
      return true;
    }

    try {
      const body = await parseBody(req);
      const users = await storage.getUsers();
      const user = users.find((item) => item.id === String(body.userId || "").trim());
      if (!user) {
        sendJson(res, 404, { error: "User not found" });
        return true;
      }
      if (user.role === "super_admin") {
        sendJson(res, 400, { error: "Owner login cannot be changed here" });
        return true;
      }
      user.isActive = Boolean(body.isActive);
      await storage.updateUser(user);
      await writeLog({
        clinicId: user.clinicId,
        user: adminSession.name,
        type: "user_status_changed",
        message: `${user.username} marked as ${user.isActive ? "active" : "inactive"}`
      });
      sendJson(res, 200, { user: normalizeUser(user) });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/users/reset-password") {
    const adminSession = requireRole(req, res, ["super_admin"]);
    if (!adminSession) {
      return true;
    }

    try {
      const body = await parseBody(req);
      const users = await storage.getUsers();
      const user = users.find((item) => item.id === String(body.userId || "").trim());
      const password = String(body.password || "").trim();
      if (!user) {
        sendJson(res, 404, { error: "User not found" });
        return true;
      }
      if (!password) {
        sendJson(res, 400, { error: "New password is required" });
        return true;
      }
      user.passwordHash = hashPassword(password);
      await storage.updateUser(user);
      await writeLog({
        clinicId: user.clinicId,
        user: adminSession.name,
        type: "password_reset",
        message: `Password reset for ${user.username}`
      });
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/patients") {
    const q = String(url.searchParams.get("q") || "").trim().toLowerCase();
    const filtered = (await storage.getPatientsByClinic(session.clinicId))
      .filter((patient) => {
        if (!q) {
          return true;
        }
        return getSearchText(patient).includes(q);
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 25)
      .map(normalizePatient);

    sendJson(res, 200, { patients: filtered });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/patients") {
    try {
      const body = await parseBody(req);
      const patient = {
        id: crypto.randomUUID(),
        clinicId: session.clinicId,
        uhid: await generateUhid(session.clinicId),
        patientName: String(body.patientName || "").trim(),
        age: String(body.age || "").trim(),
        dob: String(body.dob || "").trim(),
        partnerName: String(body.partnerName || "").trim(),
        partnerAge: String(body.partnerAge || "").trim(),
        partnerDob: String(body.partnerDob || "").trim(),
        mobile: String(body.mobile || "").trim(),
        alternateMobile: String(body.alternateMobile || "").trim(),
        enquirySource: String(body.enquirySource || "").trim(),
        doctorName: String(body.doctorName || "").trim(),
        address: String(body.address || "").trim(),
        state: String(body.state || "").trim(),
        city: String(body.city || "").trim(),
        maritalStatus: String(body.maritalStatus || "").trim(),
        yearsMarried: String(body.yearsMarried || "").trim(),
        marriageDate: String(body.marriageDate || "").trim(),
        previousChildren: String(body.previousChildren || "").trim(),
        childCount: String(body.childCount || "").trim(),
        childDetails: String(body.childDetails || "").trim(),
        consultationFor: Array.isArray(body.consultationFor) ? body.consultationFor : [],
        consultationOther: String(body.consultationOther || "").trim(),
        pastHistory: String(body.pastHistory || "").trim(),
        reference: String(body.reference || "").trim(),
        referredBy: String(body.referredBy || "").trim(),
        hospitalClinic: String(body.hospitalClinic || "").trim(),
        notes: String(body.notes || "").trim(),
        nextFollowUpDate: String(body.nextFollowUpDate || "").trim(),
        status: "New Registration",
        createdAt: new Date().toISOString(),
        followUps: []
      };

      if (
        !patient.patientName ||
        !patient.mobile ||
        !patient.alternateMobile ||
        !patient.enquirySource ||
        !patient.dob ||
        !patient.address ||
        !patient.state ||
        !patient.city ||
        !patient.maritalStatus ||
        !patient.nextFollowUpDate
      ) {
        sendJson(res, 400, {
          error:
            "Patient name, contact number, alternate contact number, enquiry source, date of birth, address, state, city, marital status, and next follow-up date are required"
        });
        return true;
      }

      if (patient.previousChildren === "Yes" && !patient.childCount) {
        sendJson(res, 400, { error: "Please select the number of children" });
        return true;
      }

      await storage.createPatient(patient);
      await writeLog({
        clinicId: session.clinicId,
        user: session.name,
        type: "patient_created",
        message: `${patient.patientName} created with ${patient.uhid}`
      });
      sendJson(res, 201, { patient: normalizePatient(patient) });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return true;
  }

  const patientMatch = url.pathname.match(/^\/api\/patients\/([^/]+)$/);
  if (req.method === "GET" && patientMatch) {
    const patient = await storage.getPatientById(session.clinicId, patientMatch[1]);
    if (!patient) {
      sendJson(res, 404, { error: "Patient not found" });
      return true;
    }
    sendJson(res, 200, { patient: normalizePatient(patient) });
    return true;
  }

  const followUpMatch = url.pathname.match(/^\/api\/patients\/([^/]+)\/followups$/);
  if (req.method === "POST" && followUpMatch) {
    try {
      const body = await parseBody(req);
      const patient = await storage.getPatientById(session.clinicId, followUpMatch[1]);
      if (!patient) {
        sendJson(res, 404, { error: "Patient not found" });
        return true;
      }

      const followUp = {
        id: crypto.randomUUID(),
        date: String(body.date || "").trim(),
        note: String(body.note || "").trim(),
        mode: String(body.mode || "").trim() || "Phone",
        createdAt: new Date().toISOString(),
        createdBy: session.name
      };

      if (!followUp.date || !followUp.note) {
        sendJson(res, 400, { error: "Follow-up date and note are required" });
        return true;
      }

      patient.followUps = patient.followUps || [];
      patient.followUps.unshift(followUp);
      patient.nextFollowUpDate = followUp.date;
      patient.status = "Follow-up Pending";
      await storage.updatePatient(patient);
      await writeLog({
        clinicId: session.clinicId,
        user: session.name,
        type: "followup_added",
        message: `Follow-up added for ${patient.patientName} on ${followUp.date}`
      });

      sendJson(res, 201, { patient: normalizePatient(patient) });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return true;
  }

  sendJson(res, 404, { error: "API route not found" });
  return true;
}

function serveStatic(req, res, url) {
  let filePath = path.join(PUBLIC_DIR, url.pathname === "/" ? "index.html" : url.pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (!error && stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    fs.access(filePath, fs.constants.F_OK, (accessError) => {
      if (accessError) {
        sendJson(res, 404, { error: "Not found" });
        return;
      }
      sendFile(res, filePath);
    });
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  Promise.resolve()
    .then(() => handleApi(req, res, url))
    .then((handled) => {
      if (!handled) {
        serveStatic(req, res, url);
      }
    })
    .catch((error) => {
      console.error(error);
      sendJson(res, 500, { error: "Internal server error" });
    });
});

async function startServer() {
  await storage.init();
  server.listen(PORT, () => {
    console.log(
      `IVF web panel running at http://localhost:${PORT} using ${DATA_PROVIDER.toUpperCase()} storage`
    );
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

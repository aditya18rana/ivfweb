const state = {
  user: null,
  patients: [],
  selectedPatient: null,
  dashboard: null,
  activity: [],
  activeView: "home"
};

const clinicTitle = document.getElementById("clinicTitle");
const logoutBtn = document.getElementById("logoutBtn");
const patientForm = document.getElementById("patientForm");
const formMessage = document.getElementById("formMessage");
const patientList = document.getElementById("patientList");
const patientView = document.getElementById("patientView");
const homePatientView = document.getElementById("homePatientView");
const patientPreview = document.getElementById("patientPreview");
const patientStatus = document.getElementById("patientStatus");
const homePatientStatus = document.getElementById("homePatientStatus");
const globalSearch = document.getElementById("globalSearch");
const searchBtn = document.getElementById("searchBtn");
const searchSuggestions = document.getElementById("searchSuggestions");
const statTotal = document.getElementById("statTotal");
const statToday = document.getElementById("statToday");
const statFollowups = document.getElementById("statFollowups");
const statTodayQueue = document.getElementById("statTodayQueue");
const todayFollowups = document.getElementById("todayFollowups");
const activityList = document.getElementById("activityList");
const homeActivityList = document.getElementById("homeActivityList");
const homeRecentPatients = document.getElementById("homeRecentPatients");
const homeGreeting = document.getElementById("homeGreeting");
const homeSummaryText = document.getElementById("homeSummaryText");
const heroFocusTag = document.getElementById("heroFocusTag");
const heroQueueTag = document.getElementById("heroQueueTag");
const heroDoctorTag = document.getElementById("heroDoctorTag");
const heroPriorityValue = document.getElementById("heroPriorityValue");
const homeCreateAction = document.getElementById("homeCreateAction");
const homePatientsAction = document.getElementById("homePatientsAction");
const navButtons = {
  home: document.getElementById("navHome"),
  create: document.getElementById("navCreate"),
  patients: document.getElementById("navPatients")
};
const sections = {
  home: document.getElementById("homeSection"),
  create: document.getElementById("createSection"),
  patients: document.getElementById("patientsSection")
};
const patientDobInput = patientForm?.querySelector('input[name="dob"]');
const patientAgeInput = patientForm?.querySelector('input[name="age"]');
const partnerDobInput = patientForm?.querySelector('input[name="partnerDob"]');
const partnerAgeInput = patientForm?.querySelector('input[name="partnerAge"]');
const stateInput = patientForm?.querySelector('select[name="state"]');
const cityInput = patientForm?.querySelector('select[name="city"]');
const previousChildrenInput = patientForm?.querySelector('select[name="previousChildren"]');
const childQtyField = document.getElementById("childQtyField");
const childCountInput = patientForm?.querySelector('select[name="childCount"]');

let searchRequestId = 0;

const INDIA_STATE_CITY_MAP = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang", "Ziro"],
  Assam: ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Tezpur"],
  Bihar: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga"],
  Chhattisgarh: ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg"],
  Goa: ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
  Haryana: ["Gurugram", "Faridabad", "Panipat", "Hisar", "Ambala"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Kullu"],
  Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh"],
  Karnataka: ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi"],
  Kerala: ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kannur"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain"],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
  Manipur: ["Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Ukhrul"],
  Meghalaya: ["Shillong", "Tura", "Nongpoh", "Jowai", "Baghmara"],
  Mizoram: ["Aizawl", "Lunglei", "Champhai", "Saiha", "Kolasib"],
  Nagaland: ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha"],
  Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Sambalpur", "Berhampur"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
  Sikkim: ["Gangtok", "Namchi", "Geyzing", "Mangan", "Singtam"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli"],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
  Tripura: ["Agartala", "Udaipur", "Dharmanagar", "Kailasahar", "Belonia"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj"],
  Uttarakhand: ["Dehradun", "Haridwar", "Haldwani", "Roorkee", "Rudrapur"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Siliguri", "Asansol"],
  "Andaman and Nicobar Islands": ["Port Blair"],
  Chandigarh: ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  Delhi: ["New Delhi", "Dwarka", "Rohini", "Saket", "Karol Bagh"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Pulwama"],
  Ladakh: ["Leh", "Kargil"],
  Lakshadweep: ["Kavaratti"],
  Puducherry: ["Puducherry", "Karaikal", "Mahe", "Yanam"]
};

function setActiveView(view) {
  state.activeView = view;
  Object.entries(sections).forEach(([key, section]) => {
    const isActive = key === view;
    section.hidden = !isActive;
    section.setAttribute("aria-hidden", String(!isActive));
  });
  Object.entries(navButtons).forEach(([key, button]) => {
    if (button) {
      button.classList.toggle("active", key === view);
    }
  });
  renderSuggestions([]);
  window.scrollTo({ top: 0, behavior: "auto" });
  if (view === "home") {
    renderPatientView();
  }
}

function calculateAgeFromDob(value) {
  if (!value) {
    return "";
  }
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) {
    return "";
  }
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return age >= 0 ? String(age) : "";
}

function syncAgeFields() {
  patientAgeInput.value = calculateAgeFromDob(patientDobInput?.value || "");
  partnerAgeInput.value = calculateAgeFromDob(partnerDobInput?.value || "");
}

function syncChildFields() {
  const showChildCount = previousChildrenInput?.value === "Yes";
  childQtyField.classList.toggle("hidden", !showChildCount);
  childCountInput.required = showChildCount;
  if (!showChildCount) {
    childCountInput.value = "";
  }
}

function populateStateOptions() {
  const states = Object.keys(INDIA_STATE_CITY_MAP).sort((a, b) => a.localeCompare(b));
  stateInput.innerHTML = `
    <option value="">Select State</option>
    ${states.map((state) => `<option value="${escapeHtml(state)}">${escapeHtml(state)}</option>`).join("")}
  `;
}

function syncCityOptions() {
  const cities = INDIA_STATE_CITY_MAP[stateInput.value] || [];
  cityInput.innerHTML = `
    <option value="">Select City</option>
    ${cities.map((city) => `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`).join("")}
  `;
  cityInput.disabled = !stateInput.value;
}

function renderDashboard() {
  const dashboard = state.dashboard;
  statTotal.textContent = dashboard?.totalPatients ?? 0;
  statToday.textContent = dashboard?.todayPatients ?? 0;
  statFollowups.textContent = dashboard?.followUpPending ?? 0;
  statTodayQueue.textContent = dashboard?.todayFollowUps?.length ?? 0;
  homeGreeting.textContent = `${state.user?.clinicName || "Clinic"} Front Desk Overview`;
  homeSummaryText.textContent = `Track registrations, follow-ups, and today's front desk movement from one screen. Search any patient above to open Patient 360 instantly.`;
  heroFocusTag.textContent = `${dashboard?.todayPatients ?? 0} new registrations today`;
  heroQueueTag.textContent = `${dashboard?.followUpPending ?? 0} total follow-ups pending`;
  heroDoctorTag.textContent = state.selectedPatient?.doctorName
    ? `Doctor: ${state.selectedPatient.doctorName}`
    : "Doctor not selected yet";
  heroPriorityValue.textContent = state.selectedPatient?.patientName
    ? `${state.selectedPatient.patientName} | ${state.selectedPatient.uhid}`
    : dashboard?.todayFollowUps?.[0]?.patientName || "No patient selected";
  todayFollowups.innerHTML = (dashboard?.todayFollowUps || []).length
    ? dashboard.todayFollowUps
        .map(
          (patient) => `
            <button class="mini-row" data-open-patient="${patient.id}">
              <div>
                <strong>${escapeHtml(patient.patientName)}</strong>
                <span>${escapeHtml(patient.doctorName || "Doctor not added")}</span>
              </div>
              <span>${escapeHtml(patient.nextFollowUpDate || "-")}</span>
            </button>
          `
        )
        .join("")
    : `<div class="empty-state small">No follow-ups scheduled for today.</div>`;

  homeRecentPatients.innerHTML = (dashboard?.recentPatients || []).length
    ? dashboard.recentPatients
        .map(
          (patient) => `
            <button class="mini-row patient-mini-card" data-open-patient="${patient.id}">
              <div>
                <strong>${escapeHtml(patient.patientName)}</strong>
                <span>${escapeHtml(patient.uhid)}</span>
              </div>
              <div class="patient-row-meta">
                <span>${escapeHtml(patient.doctorName || "Doctor pending")}</span>
                <span>${formatDate(patient.createdAt)}</span>
              </div>
            </button>
          `
        )
        .join("")
    : `<div class="empty-state small">Recent patients will appear here.</div>`;

  activityList.innerHTML = state.activity.length
    ? state.activity
        .map(
          (item) => `
            <div class="mini-row static">
              <strong>${escapeHtml(item.message)}</strong>
              <span>${formatDate(item.createdAt)}</span>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state small">No recent clinic activity available.</div>`;

  homeActivityList.innerHTML = state.activity.length
    ? state.activity
        .slice(0, 4)
        .map(
          (item) => `
            <div class="mini-row static">
              <div>
                <strong>${escapeHtml(item.message)}</strong>
                <span>${escapeHtml(item.user || "System")}</span>
              </div>
              <span>${formatDate(item.createdAt)}</span>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state small">Front desk activity will appear here.</div>`;

  document.querySelectorAll("[data-open-patient]").forEach((button) => {
    button.addEventListener("click", async () => {
      await openPatient(button.dataset.openPatient);
      setActiveView("home");
    });
  });
}

function renderPatients() {
  if (!state.patients.length) {
    patientList.innerHTML = `<div class="empty-state small">No patient records found.</div>`;
    patientPreview.innerHTML = "Select a patient from the list to view a quick summary here.";
    return;
  }
  patientList.innerHTML = state.patients
    .map(
      (patient) => `
        <button class="patient-row ${state.selectedPatient?.id === patient.id ? "active" : ""}" data-id="${patient.id}">
          <div>
            <strong>${escapeHtml(patient.patientName)}</strong>
            <p>${escapeHtml(patient.uhid)}</p>
          </div>
          <div class="patient-row-meta">
            <span>${escapeHtml(patient.mobile || "-")}</span>
            <span>${formatDate(patient.createdAt)}</span>
          </div>
        </button>
      `
    )
    .join("");

  document.querySelectorAll(".patient-row").forEach((button) => {
    button.addEventListener("click", async () => {
      await openPatient(button.dataset.id);
      setActiveView("home");
    });
  });

  renderPatientPreview();
}

function renderPatientPreview() {
  const patient = state.selectedPatient;
  if (!patient) {
    patientPreview.innerHTML = "Select a patient from the list to view a quick summary here.";
    return;
  }
  patientPreview.innerHTML = `
    <div class="preview-box">
      <strong>${escapeHtml(patient.patientName)}</strong>
      <p>${escapeHtml(patient.uhid)}</p>
      <p>${escapeHtml(patient.mobile || "-")}</p>
      <p>${escapeHtml(patient.doctorName || "Doctor not added")}</p>
      <p>${escapeHtml(patient.nextFollowUpDate || "No follow-up date")}</p>
    </div>
  `;
}

function buildPatientViewMarkup(patient) {
  return `
    <div class="his-toolbar">
      <div class="his-tabs">
        <span class="his-tab active">Patient 360</span>
        <span class="his-tab">History</span>
      </div>
      <div class="his-searchline">
        <span class="his-uhid-label">UHID</span>
        <span class="his-uhid-value">${escapeHtml(patient.uhid)}</span>
        <button type="button" class="his-action-btn">Advance</button>
        <button type="button" class="his-action-btn light">Refresh</button>
      </div>
    </div>

    <div class="his-layout">
      <section class="his-main">
        <div class="his-profile-strip">
          <div class="his-avatar-card">
            <div class="his-avatar-frame">
              <span>${getInitials(patient.patientName)}</span>
            </div>
            <strong>${escapeHtml(patient.patientName)}</strong>
            <small>(Age: ${escapeHtml(patient.age || "-")})</small>
          </div>
          <div class="his-avatar-card">
            <div class="his-avatar-frame partner">
              <span>${getInitials(patient.partnerName || "P")}</span>
            </div>
            <strong>${escapeHtml(patient.partnerName || "Partner Detail")}</strong>
            <small>(Age: ${escapeHtml(patient.partnerAge || "-")})</small>
          </div>
        </div>

        <div class="his-summary">
          <div class="his-summary-head">
            <div>
              <h3>${escapeHtml(patient.patientName)}</h3>
              <p>UHID : ${escapeHtml(patient.uhid)}</p>
            </div>
            <span class="his-consulted-pill">${escapeHtml(patient.status || "Consulted")}</span>
          </div>

          <div class="his-meta-grid">
            <div><span>Old Patient</span><strong>No</strong></div>
            <div><span>Clinic</span><strong>${escapeHtml(state.user?.clinicName || "-")}</strong></div>
            <div><span>Contact</span><strong>${escapeHtml(patient.mobile || "-")}</strong></div>
            <div><span>Alternate Contact</span><strong>${escapeHtml(patient.alternateMobile || "-")}</strong></div>
            <div><span>Enquiry Source</span><strong>${escapeHtml(patient.enquirySource || "-")}</strong></div>
            <div><span>State</span><strong>${escapeHtml(patient.state || "-")}</strong></div>
            <div><span>City</span><strong>${escapeHtml(patient.city || "-")}</strong></div>
            <div><span>Account Date</span><strong>${formatDate(patient.createdAt)}</strong></div>
            <div><span>Account Status</span><strong>Active</strong></div>
            <div><span>Doctor</span><strong>${escapeHtml(patient.doctorName || "Not assigned")}</strong></div>
            <div><span>Visit Purpose</span><strong>${escapeHtml((patient.consultationFor || []).join(", ") || patient.consultationOther || "Consultation")}</strong></div>
            <div><span>File Type</span><strong>General</strong></div>
          </div>

          <div class="his-chip-row">
            <span class="his-chip">Visit Category: B2C</span>
            <span class="his-chip">Referral: ${escapeHtml(patient.referredBy || "Direct Walk-in")}</span>
            <a class="his-chip whatsapp-chip" href="https://wa.me/91${encodeURIComponent(String(patient.mobile || "").replace(/\D/g, ""))}" target="_blank" rel="noreferrer">WhatsApp</a>
          </div>
        </div>

        <div class="his-bottom-actions">
          <button type="button" class="his-red-btn">View Vitals For Patient</button>
          <button type="button" class="his-red-btn">USG Results For Patient</button>
          <button type="button" class="his-red-btn">Pre Consult Form</button>
          <button type="button" class="his-red-btn">Print Summary</button>
          <button type="button" class="his-red-btn">Update Viral Markers</button>
        </div>

        <section class="followup-section his-followup-box">
          <div class="followup-header">
            <h4>Follow-up Timeline</h4>
          </div>
          <form class="followUpForm followup-form">
            <input type="date" name="date" required />
            <select name="mode">
              <option value="Phone">Phone</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Visit">Visit</option>
            </select>
            <input type="text" name="note" placeholder="Follow-up note" required />
            <button type="submit" class="primary-btn">Add Follow-up</button>
          </form>
        </section>
      </section>

      <aside class="his-timeline-panel">
        <h4>Timeline</h4>
        <div class="timeline his-timeline">
          ${
            (patient.followUps || []).length
              ? patient.followUps
                  .map(
                    (item) => `
                      <div class="timeline-item his-time-item">
                        <strong>${escapeHtml(item.date)}</strong>
                        <span>${escapeHtml(item.mode)}</span>
                        <p>${escapeHtml(item.note)}</p>
                      </div>
                    `
                  )
                  .join("")
              : `
                <div class="timeline-item his-time-item">
                  <strong>${formatDate(patient.createdAt)}</strong>
                  <span>Created</span>
                  <p>Patient record created.</p>
                </div>
                <div class="timeline-item his-time-item">
                  <strong>${escapeHtml(patient.nextFollowUpDate || formatDate(patient.createdAt))}</strong>
                  <span>Follow-up</span>
                  <p>${escapeHtml(patient.notes || "Next follow-up pending.")}</p>
                </div>
              `
          }
        </div>
      </aside>
    </div>
  `;
}

function attachFollowUpHandlers(patientId) {
  document.querySelectorAll(".followUpForm").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(form).entries());
      try {
        const data = await api(`/api/patients/${patientId}/followups`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        state.selectedPatient = data.patient;
        await refreshData(globalSearch.value.trim());
        setActiveView("home");
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

function renderPatientView() {
  const patient = state.selectedPatient;
  const emptyMessage = "Search and select a patient to view Patient 360 details here.";
  if (!patient) {
    patientStatus.textContent = "No patient selected";
    homePatientStatus.textContent = "No patient selected";
    heroDoctorTag.textContent = "Doctor not selected yet";
    heroPriorityValue.textContent = state.dashboard?.todayFollowUps?.[0]?.patientName || "No patient selected";
    patientView.className = "patient-view empty-state";
    patientView.textContent = emptyMessage;
    homePatientView.className = "patient-view empty-state";
    homePatientView.textContent = emptyMessage;
    return;
  }

  const markup = buildPatientViewMarkup(patient);
  patientStatus.textContent = patient.status || "Active";
  homePatientStatus.textContent = patient.status || "Active";
  heroDoctorTag.textContent = patient.doctorName
    ? `Doctor: ${patient.doctorName}`
    : "Doctor not selected yet";
  heroPriorityValue.textContent = `${patient.patientName} | ${patient.uhid}`;
  patientView.className = "patient-view his-patient-view";
  patientView.innerHTML = markup;
  homePatientView.className = "patient-view his-patient-view";
  homePatientView.innerHTML = markup;
  attachFollowUpHandlers(patient.id);
}

function renderSuggestions(items) {
  if (!globalSearch.value.trim() || !items.length) {
    searchSuggestions.hidden = true;
    searchSuggestions.innerHTML = "";
    return;
  }
  searchSuggestions.innerHTML = items
    .slice(0, 8)
    .map(
      (patient) => `
        <button class="suggestion-item" type="button" data-patient-id="${patient.id}">
          <div>
            <strong>${escapeHtml(patient.patientName)}</strong>
            <span>${escapeHtml(patient.uhid)}</span>
          </div>
          <small>${escapeHtml(patient.mobile || "-")}</small>
        </button>
      `
    )
    .join("");
  searchSuggestions.hidden = false;
  document.querySelectorAll(".suggestion-item").forEach((button) => {
    button.addEventListener("click", async () => {
      await openPatient(button.dataset.patientId);
      globalSearch.value = state.selectedPatient?.patientName || "";
      renderSuggestions([]);
      setActiveView("home");
    });
  });
}

async function fetchSuggestions(query) {
  const currentRequestId = ++searchRequestId;
  if (!query.trim()) {
    renderSuggestions([]);
    return;
  }
  try {
    const data = await api(`/api/patients?q=${encodeURIComponent(query)}`);
    if (currentRequestId !== searchRequestId) {
      return;
    }
    renderSuggestions(data.patients || []);
  } catch (error) {
    renderSuggestions([]);
  }
}

async function openPatient(id) {
  const data = await api(`/api/patients/${id}`);
  state.selectedPatient = data.patient;
  renderPatients();
  renderPatientView();
}

async function loadPatients(query = "", options = {}) {
  const { autoSelectFirst = false } = options;
  const data = await api(`/api/patients?q=${encodeURIComponent(query)}`);
  state.patients = data.patients;
  if (state.selectedPatient) {
    const updated = state.patients.find((patient) => patient.id === state.selectedPatient.id);
    if (updated) {
      state.selectedPatient = updated;
    } else if (query) {
      state.selectedPatient = null;
    }
  }
  if (!state.selectedPatient && autoSelectFirst && state.patients.length) {
    state.selectedPatient = state.patients[0];
  }
  renderPatients();
  renderPatientView();
}

async function refreshData(query = "") {
  const [dashboardData, activityData] = await Promise.all([
    api("/api/dashboard"),
    api("/api/activity")
  ]);
  state.dashboard = dashboardData.dashboard;
  state.activity = activityData.logs;
  await loadPatients(query);
  renderDashboard();
}

patientForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "";
  const formData = new FormData(patientForm);
  const payload = {};
  for (const [key, value] of formData.entries()) {
    if (key === "consultationFor") {
      if (!payload.consultationFor) {
        payload.consultationFor = [];
      }
      payload.consultationFor.push(value);
    } else {
      payload[key] = value;
    }
  }
  try {
    const data = await api("/api/patients", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    formMessage.textContent = `Patient created successfully. UHID: ${data.patient.uhid}`;
    patientForm.reset();
    syncAgeFields();
    syncChildFields();
    syncCityOptions();
    state.selectedPatient = data.patient;
    globalSearch.value = data.patient.patientName;
    await refreshData(globalSearch.value.trim());
    renderSuggestions([]);
    setActiveView("home");
  } catch (error) {
    formMessage.textContent = error.message;
  }
});

searchBtn.addEventListener("click", async () => {
  await loadPatients(globalSearch.value.trim(), { autoSelectFirst: true });
  renderSuggestions([]);
  setActiveView("home");
});

globalSearch.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    await loadPatients(globalSearch.value.trim(), { autoSelectFirst: true });
    renderSuggestions([]);
    setActiveView("home");
  }
});

globalSearch.addEventListener("input", async () => {
  await fetchSuggestions(globalSearch.value);
});

patientDobInput?.addEventListener("change", syncAgeFields);
patientDobInput?.addEventListener("input", syncAgeFields);
partnerDobInput?.addEventListener("change", syncAgeFields);
partnerDobInput?.addEventListener("input", syncAgeFields);
previousChildrenInput?.addEventListener("change", syncChildFields);
  stateInput?.addEventListener("change", syncCityOptions);
homeCreateAction?.addEventListener("click", () => setActiveView("create"));
homePatientsAction?.addEventListener("click", async () => {
  setActiveView("patients");
  await loadPatients(globalSearch.value.trim(), { autoSelectFirst: false });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".header-search")) {
    renderSuggestions([]);
  }
});

navButtons.home.addEventListener("click", () => setActiveView("home"));
navButtons.create.addEventListener("click", () => setActiveView("create"));
navButtons.patients.addEventListener("click", async () => {
  setActiveView("patients");
  await loadPatients(globalSearch.value.trim(), { autoSelectFirst: false });
});

logoutBtn.addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  window.location.href = "./index.html";
});

(async function initHospitalApp() {
  try {
    const session = await api("/api/session");
    if (!session.authenticated || session.user?.role === "super_admin") {
      window.location.href = session.user?.role === "super_admin" ? "./owner.html" : "./index.html";
      return;
    }
    state.user = session.user;
    clinicTitle.textContent = `${session.user.clinicName} Patient 360`;
    populateStateOptions();
    syncCityOptions();
    syncAgeFields();
    syncChildFields();
    renderPatients();
    renderPatientView();
    renderDashboard();
    await refreshData();
    setActiveView("home");
  } catch (error) {
    console.error(error);
    window.location.href = "./index.html";
  }
})();

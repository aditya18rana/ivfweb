const clinicTitle = document.getElementById("clinicTitle");
const logoutBtn = document.getElementById("logoutBtn");
const refreshOwnerBtn = document.getElementById("refreshOwnerBtn");
const clinicForm = document.getElementById("clinicForm");
const clinicFormMessage = document.getElementById("clinicFormMessage");
const userForm = document.getElementById("userForm");
const userFormMessage = document.getElementById("userFormMessage");
const clinicList = document.getElementById("clinicList");
const userList = document.getElementById("userList");
const adminClinicCount = document.getElementById("adminClinicCount");
const adminUserCount = document.getElementById("adminUserCount");
const adminPatientCount = document.getElementById("adminPatientCount");
const userClinicSelect = document.getElementById("userClinicSelect");

function setOwnerMessage(target, message, isError = false) {
  target.textContent = message;
  target.classList.toggle("error-text", isError);
}

function renderAdminSummary(summary) {
  adminClinicCount.textContent = summary?.counts?.clinics ?? 0;
  adminUserCount.textContent = summary?.counts?.users ?? 0;
  adminPatientCount.textContent = summary?.counts?.patients ?? 0;

  const clinics = summary?.clinics || [];
  clinicList.innerHTML = clinics.length
    ? clinics
        .map(
          (clinic) => `
            <div class="mini-row static action-row">
              <div>
                <strong>${escapeHtml(clinic.name)}</strong>
                <span>${escapeHtml(clinic.shortCode)} | ${escapeHtml(clinic.city || "-")} | ${clinic.isActive === false ? "Inactive" : "Active"}</span>
              </div>
              <button class="secondary-btn admin-action-btn" type="button" data-clinic-id="${clinic.id}" data-clinic-active="${clinic.isActive === false ? "false" : "true"}">
                ${clinic.isActive === false ? "Activate" : "Deactivate"}
              </button>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state small">No clinics onboarded yet.</div>`;

  const users = summary?.users || [];
  userList.innerHTML = users.length
    ? users
        .map(
          (user) => `
            <div class="mini-row static action-row">
              <div>
                <strong>${escapeHtml(user.name)} (${escapeHtml(user.role)})</strong>
                <span>${escapeHtml(user.username)} | ${escapeHtml(user.clinicName || "-")} | ${user.isActive === false ? "Inactive" : "Active"}</span>
              </div>
              <div class="inline-actions">
                <button class="secondary-btn admin-action-btn" type="button" data-user-id="${user.id}" data-user-active="${user.isActive === false ? "false" : "true"}">
                  ${user.isActive === false ? "Activate" : "Deactivate"}
                </button>
                <button class="secondary-btn admin-action-btn" type="button" data-reset-user-id="${user.id}" data-reset-username="${escapeHtml(user.username)}">
                  Reset Password
                </button>
              </div>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state small">No employee logins created yet.</div>`;

  userClinicSelect.innerHTML = `
    <option value="">Select Clinic</option>
    ${clinics
      .map(
        (clinic) =>
          `<option value="${escapeHtml(clinic.id)}">${escapeHtml(clinic.name)}</option>`
      )
      .join("")}
  `;

  document.querySelectorAll("[data-clinic-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const clinicId = button.dataset.clinicId;
      const current = button.dataset.clinicActive === "true";
      try {
        const response = await api("/api/admin/clinics/status", {
          method: "POST",
          body: JSON.stringify({ clinicId, isActive: !current })
        });
        setOwnerMessage(
          clinicFormMessage,
          `${response.clinic.name} is now ${response.clinic.isActive ? "active" : "inactive"}.`
        );
        await refreshAdminSummary();
      } catch (error) {
        setOwnerMessage(clinicFormMessage, error.message, true);
      }
    });
  });

  document.querySelectorAll("[data-user-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = button.dataset.userId;
      const current = button.dataset.userActive === "true";
      try {
        const response = await api("/api/admin/users/status", {
          method: "POST",
          body: JSON.stringify({ userId, isActive: !current })
        });
        setOwnerMessage(
          userFormMessage,
          `${response.user.username} is now ${response.user.isActive ? "active" : "inactive"}.`
        );
        await refreshAdminSummary();
      } catch (error) {
        setOwnerMessage(userFormMessage, error.message, true);
      }
    });
  });

  document.querySelectorAll("[data-reset-user-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = button.dataset.resetUserId;
      const username = button.dataset.resetUsername;
      const password = window.prompt(`Enter a new password for ${username}`);
      if (!password) {
        return;
      }
      try {
        await api("/api/admin/users/reset-password", {
          method: "POST",
          body: JSON.stringify({ userId, password })
        });
        setOwnerMessage(userFormMessage, `Password reset for ${username}.`);
        await refreshAdminSummary();
      } catch (error) {
        setOwnerMessage(userFormMessage, error.message, true);
      }
    });
  });
}

async function refreshAdminSummary() {
  const data = await api("/api/admin/summary");
  renderAdminSummary(data.summary);
}

clinicForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setOwnerMessage(clinicFormMessage, "");
  const payload = Object.fromEntries(new FormData(clinicForm).entries());
  try {
    const data = await api("/api/admin/clinics", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setOwnerMessage(clinicFormMessage, `Hospital onboarded. Admin login: ${data.user.username}`);
    clinicForm.reset();
    await refreshAdminSummary();
  } catch (error) {
    setOwnerMessage(clinicFormMessage, error.message, true);
  }
});

userForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setOwnerMessage(userFormMessage, "");
  const payload = Object.fromEntries(new FormData(userForm).entries());
  try {
    const data = await api("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setOwnerMessage(userFormMessage, `Employee login created: ${data.user.username}`);
    userForm.reset();
    await refreshAdminSummary();
  } catch (error) {
    setOwnerMessage(userFormMessage, error.message, true);
  }
});

logoutBtn.addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  window.location.href = "./index.html";
});

refreshOwnerBtn.addEventListener("click", async () => {
  await refreshAdminSummary();
});

(async function initOwnerApp() {
  try {
    const session = await api("/api/session");
    if (!session.authenticated || session.user?.role !== "super_admin") {
      window.location.href = "./index.html";
      return;
    }
    clinicTitle.textContent = `${session.user.name} Admin Console`;
    await refreshAdminSummary();
  } catch (error) {
    console.error(error);
    window.location.href = "./index.html";
  }
})();

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  const formData = new FormData(loginForm);
  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    redirectByRole(data.user);
  } catch (error) {
    loginError.textContent = error.message;
  }
});

(async function initLogin() {
  try {
    const data = await api("/api/session");
    if (data.authenticated && data.user) {
      redirectByRole(data.user);
    }
  } catch (error) {
    console.error(error);
  }
})();

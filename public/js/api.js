async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const plainDateMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (plainDateMatch) {
      return `${plainDateMatch[3]}/${plainDateMatch[2]}/${plainDateMatch[1]}`;
    }
    return value;
  }
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function getInitials(value) {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!words.length) {
    return "P";
  }
  return words.map((word) => word[0].toUpperCase()).join("");
}

function redirectByRole(user) {
  if (user?.role === "super_admin") {
    window.location.href = "./owner.html";
    return;
  }
  window.location.href = "./hospital.html";
}

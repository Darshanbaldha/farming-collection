(() => {
  "use strict";

  const details = document.getElementById("account-details");
  const errorBox = document.getElementById("account-error");
  const escapeHtml = (value) => String(value || "Not provided").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));

  const fields = [
    ["Mobile number", "mobileNumber", "bi-telephone"],
    ["Home / delivery address", "address", "bi-house"],
    ["Farm address", "farmAddress", "bi-flower1"],
    ["City / District", "city", "bi-geo-alt"],
    ["State", "state", "bi-map"],
    ["PIN code", "pincode", "bi-mailbox"],
  ];

  async function loadProfile() {
    try {
      const response = await fetch("/api/user-info/me", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to load your profile.");

      const profile = result.profile;
      document.getElementById("account-name").textContent = profile.name;
      document.getElementById("account-email").textContent = profile.email;
      details.innerHTML = fields.map(([label, key, icon]) => `
        <div class="col-md-6">
          <div class="fc-account-detail">
            <i class="bi ${icon}" aria-hidden="true"></i>
            <div><span>${label}</span><strong>${escapeHtml(profile[key])}</strong></div>
          </div>
        </div>`).join("");
    } catch (error) {
      details.innerHTML = "";
      errorBox.textContent = error.message;
      errorBox.hidden = false;
    }
  }

  loadProfile();
})();

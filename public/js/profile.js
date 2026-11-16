(() => {
  const form = document.getElementById("profile-form");
  if (!form) return;
  const errorBox = document.getElementById("profile-error");

  async function loadExistingProfile() {
    try {
      const response = await fetch("/api/user-info/me", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (response.status === 404) return;
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to load your saved profile.");

      const profile = result.profile;
      Object.entries({
        name: profile.name,
        mobileNumber: profile.mobileNumber,
        address: profile.address,
        farmAddress: profile.farmAddress,
        state: profile.state,
        city: profile.city,
        pincode: profile.pincode,
      }).forEach(([name, value]) => {
        if (form.elements[name]) form.elements[name].value = value || "";
      });
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
    }
  }

  loadExistingProfile();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.hidden = true;
    const button = form.querySelector('[type="submit"]');
    const original = button.innerHTML;
    button.disabled = true; button.textContent = "Saving details...";
    try {
      const payload = Object.fromEntries(new FormData(form));
      const response = await fetch("/api/user-info", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save your details.");
      window.location.replace("/index.html");
    } catch (error) { errorBox.textContent = error.message; errorBox.hidden = false; }
    finally { button.disabled = false; button.innerHTML = original; }
  });
})();

(() => {
  "use strict";
  const STORAGE_KEY = "kanyi-device-inventory-v1";
  const dialog = document.getElementById("device-dialog");
  const form = document.getElementById("device-form");
  const nameInput = document.getElementById("device-name");
  const typeInput = document.getElementById("device-type");
  const list = document.getElementById("device-list");
  const count = document.getElementById("device-count");
  const toast = document.getElementById("toast");
  const createPairForm = document.getElementById("create-pair-form");
  const joinPairForm = document.getElementById("join-pair-form");
  const createdCode = document.getElementById("created-code");
  const pairCodeValue = document.getElementById("pair-code-value");
  const ownerStatus = document.getElementById("pair-owner-status");
  const joinStatus = document.getElementById("join-status");
  const leaveButton = document.getElementById("leave-pair");
  let toastTimer;
  let activeCode = "";
  let pollTimer = null;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }
  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not reach the pairing service.");
    return data;
  }
  function loadDevices() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data.filter(d => d && typeof d.name === "string" && typeof d.type === "string") : [];
    } catch { return []; }
  }
  let devices = loadDevices();
  function saveDevices() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(devices)); }
    catch { showToast("Unable to save in this browser."); }
  }
  function iconFor(type) {
    return ({ Phone: "▯", Computer: "▣", Tablet: "▤", Other: "◇" })[type] || "◇";
  }
  function renderDevices() {
    count.textContent = String(devices.length);
    list.replaceChildren();
    if (!devices.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      const symbol = document.createElement("span");
      symbol.className = "empty-symbol";
      symbol.textContent = "⌘";
      const heading = document.createElement("h3");
      heading.textContent = "No devices added yet";
      const message = document.createElement("p");
      message.textContent = "Add a label to start your local inventory.";
      empty.append(symbol, heading, message);
      list.appendChild(empty);
      return;
    }
    devices.forEach((device, index) => {
      const card = document.createElement("article");
      card.className = "device-card";
      const top = document.createElement("div");
      top.className = "device-card-top";
      const icon = document.createElement("span");
      icon.className = "device-icon";
      icon.textContent = iconFor(device.type);
      const tag = document.createElement("span");
      tag.className = "device-tag";
      tag.textContent = device.type;
      top.append(icon, tag);
      const title = document.createElement("h3");
      title.textContent = device.name;
      const status = document.createElement("p");
      status.textContent = "Inventory only · Not connected";
      const remove = document.createElement("button");
      remove.className = "remove-device";
      remove.type = "button";
      remove.textContent = "Remove device";
      remove.addEventListener("click", () => {
        devices.splice(index, 1);
        saveDevices();
        renderDevices();
        showToast("Device removed from inventory.");
      });
      card.append(top, title, status, remove);
      list.appendChild(card);
    });
  }
  function setActive(code) {
    activeCode = code;
    leaveButton.hidden = !code;
    clearInterval(pollTimer);
    if (code) pollTimer = setInterval(checkSession, 2000);
  }
  async function checkSession() {
    if (!activeCode) return;
    try {
      const data = await api("/api/pair/" + encodeURIComponent(activeCode));
      const session = data.session;
      if (session.status === "paired") {
        ownerStatus.textContent = "Paired with " + session.guestName + ". This is a browser pairing only.";
        joinStatus.textContent = "Paired with " + session.ownerName + ". This is a browser pairing only.";
      } else {
        ownerStatus.textContent = "Waiting for the other device… Code expires in about 15 minutes.";
      }
    } catch (error) {
      ownerStatus.textContent = error.message;
      joinStatus.textContent = error.message;
      setActive("");
    }
  }

  document.getElementById("add-device").addEventListener("click", () => {
    form.reset();
    if (typeof dialog.showModal === "function") { dialog.showModal(); nameInput.focus(); }
    else showToast("This browser does not support the add-device dialog.");
  });
  document.getElementById("cancel-dialog").addEventListener("click", () => dialog.close());
  form.addEventListener("submit", event => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); showToast("Enter a device name first."); return; }
    devices.push({ name, type: typeInput.value, addedAt: new Date().toISOString() });
    saveDevices(); renderDevices(); dialog.close();
    showToast("Device added to your inventory.");
  });

  createPairForm.addEventListener("submit", async event => {
    event.preventDefault();
    const deviceName = document.getElementById("pair-owner-name").value.trim();
    try {
      const data = await api("/api/pair/create", {
        method: "POST", body: JSON.stringify({ deviceName })
      });
      const session = data.session;
      pairCodeValue.textContent = session.code;
      createdCode.hidden = false;
      ownerStatus.textContent = "Waiting for the other device… Code expires in about 15 minutes.";
      joinStatus.textContent = "Enter the code shown on the other device.";
      setActive(session.code);
      showToast("Pairing code created.");
    } catch (error) { showToast(error.message); ownerStatus.textContent = error.message; }
  });

  joinPairForm.addEventListener("submit", async event => {
    event.preventDefault();
    const code = document.getElementById("join-code").value.replace(/\D/g, "").slice(0, 6);
    const deviceName = document.getElementById("pair-guest-name").value.trim();
    if (code.length !== 6) { joinStatus.textContent = "Enter all six digits."; return; }
    try {
      const data = await api("/api/pair/join", {
        method: "POST", body: JSON.stringify({ code, deviceName })
      });
      setActive(data.session.code);
      joinStatus.textContent = "Paired with " + data.session.ownerName + ". This is a browser pairing only.";
      ownerStatus.textContent = "Paired with " + (data.session.guestName || deviceName) + ". This is a browser pairing only.";
      showToast("Browsers paired successfully.");
    } catch (error) { joinStatus.textContent = error.message; showToast(error.message); }
  });

  document.getElementById("copy-pair-code").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(pairCodeValue.textContent);
      showToast("Pairing code copied.");
    } catch { showToast("Please copy the code manually."); }
  });
  leaveButton.addEventListener("click", async () => {
    if (activeCode) {
      try { await api("/api/pair/" + encodeURIComponent(activeCode) + "/leave", { method: "POST", body: "{}" }); }
      catch { /* Ending locally is still possible if offline. */ }
    }
    setActive("");
    createdCode.hidden = true;
    ownerStatus.textContent = "Pairing ended.";
    joinStatus.textContent = "Pairing ended.";
    showToast("Pairing session ended.");
  });
  document.getElementById("year").textContent = String(new Date().getFullYear());
  renderDevices();
})();
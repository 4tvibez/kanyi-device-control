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
  let toastTimer;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
  }

  function loadDevices() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data.filter(d => d && typeof d.name === "string" && typeof d.type === "string") : [];
    } catch {
      return [];
    }
  }

  let devices = loadDevices();

  function saveDevices() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
    } catch {
      showToast("Unable to save in this browser.");
    }
  }

  function iconFor(type) {
    return ({ Phone: "▯", Computer: "▣", Tablet: "▤", Other: "◇" })[type] || "◇";
  }

  function renderDevices() {
    count.textContent = String(devices.length);
    list.replaceChildren();

    if (devices.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      const symbol = document.createElement("span");
      symbol.className = "empty-symbol";
      symbol.setAttribute("aria-hidden", "true");
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
      icon.setAttribute("aria-hidden", "true");
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

  document.getElementById("add-device").addEventListener("click", () => {
    form.reset();
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
      nameInput.focus();
    } else {
      showToast("This browser does not support the add-device dialog.");
    }
  });

  document.getElementById("cancel-dialog").addEventListener("click", () => dialog.close());

  form.addEventListener("submit", event => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const type = typeInput.value;
    if (!name) {
      nameInput.focus();
      showToast("Enter a device name first.");
      return;
    }
    devices.push({ name, type, addedAt: new Date().toISOString() });
    saveDevices();
    renderDevices();
    dialog.close();
    showToast("Device added to your inventory.");
  });

  document.getElementById("year").textContent = String(new Date().getFullYear());
  renderDevices();
})();
const STORAGE_KEY = "kanyi-devices";

const addButton = document.getElementById("add-device");
const deviceList = document.getElementById("device-list");
const deviceCount = document.getElementById("device-count");

let devices = [];

try {
  devices = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  if (!Array.isArray(devices)) devices = [];
} catch {
  devices = [];
}

function saveDevices() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
}

function renderDevices() {
  deviceCount.textContent = devices.length;
  deviceList.replaceChildren();

  if (devices.length === 0) {
    const message = document.createElement("p");
    message.textContent = "No devices registered yet.";
    deviceList.appendChild(message);
    return;
  }

  devices.forEach((device, index) => {
    const card = document.createElement("article");
    const title = document.createElement("h3");
    const details = document.createElement("p");
    const removeButton = document.createElement("button");

    title.textContent = device.name;
    details.textContent = `${device.type} · Not connected`;

    removeButton.textContent = "Remove device";
    removeButton.type = "button";

    removeButton.addEventListener("click", () => {
      devices.splice(index, 1);
      saveDevices();
      renderDevices();
    });

    card.append(title, details, removeButton);
    deviceList.appendChild(card);
  });
}

addButton.addEventListener("click", () => {
  const name = prompt("Enter your device name:");

  if (!name || !name.trim()) return;

  const type = prompt("Device type: Phone, Computer, Tablet, or Other");

  if (!type || !type.trim()) return;

  devices.push({
    name: name.trim(),
    type: type.trim()
  });

  saveDevices();
  renderDevices();
});

document.getElementById("year").textContent =
  new Date().getFullYear();

renderDevices();

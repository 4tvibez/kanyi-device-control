# KANYI Device Control

A responsive prototype for organizing device labels and finding official recovery resources.

## Project structure

```text
kanyi-device-control/
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── app.js
├── package.json
└── README.md
```

## Run locally

Requires Node.js.

```bash
npm install
npm start
```

Then open http://localhost:3000.

## Features

- Responsive dark dashboard
- Add and remove device labels
- Saves inventory in this browser with localStorage
- Official Android, Apple, and Microsoft support links
- Health endpoint at /health

## Limitations and safety

This is a demo inventory, not a remote-control tool. It does not connect to devices, bypass passcodes, unlock phones, or reset computers. Real remote access requires explicit authorization, secure authentication, and approved software or services on each device. For forgotten passwords, use the device manufacturer's official recovery process.
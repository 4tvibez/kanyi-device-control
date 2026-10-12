# KANYI Device Control

KANYI is a responsive device-management dashboard with a temporary, consent-based browser pairing demo.

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

Open `http://localhost:3000` in a browser.

## Features

- Responsive dashboard and local device inventory
- Temporary six-digit pairing codes
- Create a session on one browser and join it from another
- Pairing sessions expire after 15 minutes
- End a pairing session from the dashboard
- Official Android, Apple, and Microsoft recovery links
- Health endpoint at `/health`

## Deploying

Deploy this as a **Node.js web service** on a host that runs the Express server continuously and supports HTTP POST/GET requests. Set the start command to `npm start`. Both devices must open the same deployed URL.

The pairing API currently stores active sessions in server memory. Sessions will be lost when the service restarts, and multiple replicas will not share sessions. A production version should use a shared database or Redis and add stronger authentication, rate limiting, and audit logging. Do not use this prototype for sensitive data.

## Important limitations

Pairing confirms only that two browsers have joined the same temporary session. It does **not** stream screens, remotely control a device, unlock a forgotten passcode, bypass security, or factory-reset a phone or computer. Those capabilities require separate, platform-approved software and explicit on-device permission. Use the manufacturer's official recovery flow for forgotten passwords.

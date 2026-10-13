# KANYI Device Console

KANYI is a responsive device-management workspace for maintaining a local device inventory, pairing two browsers through a short-lived code, reviewing activity recorded in the current browser, and finding official device-recovery resources.

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

Open `http://localhost:3000` in a browser. For pairing, open the same deployed URL in both browsers.

## Features

- Responsive, product-style dashboard and navigation
- Local device inventory with add, view, remove, and JSON export
- Local activity history
- Temporary six-digit browser-pairing codes
- Join a pairing session from a second browser and end a session
- Service health endpoint at `/health`
- Official Android, Google Account, Samsung, Apple, Microsoft, and Google Find Hub support links
- Security center that explains the application's current capabilities and limits

## Deployment notes

Run this as a Node.js web service that supports the Express app and its GET/POST endpoints. The start command is `npm start`.

The pairing API stores active sessions in server memory. Sessions are lost on server restart, and separate server replicas do not share them. For reliable production use, replace this with a shared database or Redis, add authentication, rate limiting, request validation, and server-side audit logging, and test deployment health checks.

## Data and security limitations

- Device inventory and activity history are saved in the current browser's local storage; they are not cloud-synced or tied to an authenticated account.
- Browser pairing only confirms that two browser sessions joined the same temporary session. It does not stream screens, remotely control a device, unlock a forgotten passcode, bypass security, or factory-reset a phone or computer.
- A website alone cannot unlock every phone or computer. Use official manufacturer and account-recovery flows for forgotten passwords.
- Do not store sensitive information in this application.

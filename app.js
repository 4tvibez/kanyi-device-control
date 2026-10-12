const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "public");
const sessions = new Map();
const SESSION_TTL = 15 * 60 * 1000;

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));
app.use(express.static(publicDir));

function cleanExpired() {
  const now = Date.now();
  for (const [code, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL || session.closed) sessions.delete(code);
  }
}
function newCode() {
  let code;
  do { code = String(crypto.randomInt(100000, 1000000)); } while (sessions.has(code));
  return code;
}
function safeSession(session) {
  return {
    code: session.code,
    status: session.guest ? "paired" : "waiting",
    ownerName: session.ownerName,
    guestName: session.guest ? session.guest.name : null,
    createdAt: session.createdAt,
    expiresAt: session.createdAt + SESSION_TTL
  };
}
app.get("/health", (_req, res) => {
  res.json({ status: "ok", app: "KANYI Device Control", mode: "consent-based-pairing-demo" });
});
app.post("/api/pair/create", (req, res) => {
  cleanExpired();
  const ownerName = String(req.body?.deviceName || "My device").trim().slice(0, 60);
  const code = newCode();
  const session = { code, ownerName: ownerName || "My device", guest: null, createdAt: Date.now(), closed: false };
  sessions.set(code, session);
  res.status(201).json({ ok: true, session: safeSession(session) });
});
app.post("/api/pair/join", (req, res) => {
  cleanExpired();
  const code = String(req.body?.code || "").replace(/\D/g, "").slice(0, 6);
  const deviceName = String(req.body?.deviceName || "Partner device").trim().slice(0, 60);
  const session = sessions.get(code);
  if (!session) return res.status(404).json({ ok: false, error: "That code is invalid or has expired. Create a new code on the other device." });
  if (session.guest) return res.status(409).json({ ok: false, error: "This code has already been used. Create a new pairing code." });
  if (!code || code.length !== 6) return res.status(400).json({ ok: false, error: "Enter the six-digit pairing code." });
  session.guest = { name: deviceName || "Partner device", joinedAt: Date.now() };
  res.json({ ok: true, session: safeSession(session) });
});
app.get("/api/pair/:code", (req, res) => {
  cleanExpired();
  const session = sessions.get(String(req.params.code || ""));
  if (!session) return res.status(404).json({ ok: false, error: "Pairing session expired or closed." });
  res.json({ ok: true, session: safeSession(session) });
});
app.post("/api/pair/:code/leave", (req, res) => {
  const session = sessions.get(String(req.params.code || ""));
  if (session) sessions.delete(session.code);
  res.json({ ok: true });
});
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`KANYI dashboard running on port ${PORT}`);
});

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true, maxPayload: 1024 * 1024 });
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "public");
const sessions = new Map();
const peers = new Map();
const SESSION_TTL = 15 * 60 * 1000;

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));
app.use(express.static(publicDir));

function cleanExpired() {
  const now = Date.now();
  for (const [code, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL || session.closed) {
      sessions.delete(code);
      const room = peers.get(code);
      if (room) {
        for (const peer of room.values()) {
          if (peer.readyState === WebSocket.OPEN) peer.send(JSON.stringify({ type: "session-ended" }));
          peer.close(1000, "Session expired");
        }
        peers.delete(code);
      }
    }
  }
}
function newCode() {
  let code;
  do { code = String(crypto.randomInt(100000, 1000000)); } while (sessions.has(code));
  return code;
}
function newToken() { return crypto.randomBytes(32).toString("hex"); }
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
function send(peer, payload) {
  if (peer && peer.readyState === WebSocket.OPEN) peer.send(JSON.stringify(payload));
}
function broadcastStatus(code) {
  const session = sessions.get(code);
  const room = peers.get(code);
  if (!session || !room) return;
  const payload = { type: "peer-status", paired: Boolean(session.guest), ownerConnected: room.has("owner"), guestConnected: room.has("guest") };
  for (const peer of room.values()) send(peer, payload);
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", app: "KANYI Device Control", mode: "consent-based-webrtc-screen-share", websocket: true });
});
app.post("/api/pair/create", (req, res) => {
  cleanExpired();
  const ownerName = String(req.body?.deviceName || "My device").trim().slice(0, 60);
  const code = newCode();
  const ownerToken = newToken();
  const session = { code, ownerName: ownerName || "My device", ownerToken, guestToken: null, guest: null, createdAt: Date.now(), closed: false };
  sessions.set(code, session);
  res.status(201).json({ ok: true, token: ownerToken, role: "owner", session: safeSession(session) });
});
app.post("/api/pair/join", (req, res) => {
  cleanExpired();
  const code = String(req.body?.code || "").replace(/\D/g, "").slice(0, 6);
  const deviceName = String(req.body?.deviceName || "Partner device").trim().slice(0, 60);
  const session = sessions.get(code);
  if (!code || code.length !== 6) return res.status(400).json({ ok: false, error: "Enter the six-digit pairing code." });
  if (!session) return res.status(404).json({ ok: false, error: "That code is invalid or has expired. Create a new code on the other device." });
  if (session.guest) return res.status(409).json({ ok: false, error: "This code has already been used. Create a new pairing code." });
  const guestToken = newToken();
  session.guestToken = guestToken;
  session.guest = { name: deviceName || "Partner device", joinedAt: Date.now() };
  res.json({ ok: true, token: guestToken, role: "guest", session: safeSession(session) });
});
app.get("/api/pair/:code", (req, res) => {
  cleanExpired();
  const session = sessions.get(String(req.params.code || ""));
  if (!session) return res.status(404).json({ ok: false, error: "Pairing session expired or closed." });
  res.json({ ok: true, session: safeSession(session) });
});
app.post("/api/pair/:code/leave", (req, res) => {
  const code = String(req.params.code || "");
  const session = sessions.get(code);
  if (session) sessions.delete(code);
  const room = peers.get(code);
  if (room) {
    for (const peer of room.values()) {
      send(peer, { type: "session-ended" });
      peer.close(1000, "Session ended by participant");
    }
    peers.delete(code);
  }
  res.json({ ok: true });
});

server.on("upgrade", (request, socket, head) => {
  if (request.url !== "/ws") {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, ws => wss.emit("connection", ws, request));
});
wss.on("connection", ws => {
  let authenticated = false;
  let sessionCode = "";
  let role = "";
  const authTimeout = setTimeout(() => {
    if (!authenticated) ws.close(1008, "Authentication required");
  }, 5000);

  ws.on("message", raw => {
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return; }
    if (!authenticated) {
      if (message.type !== "auth") return ws.close(1008, "Authentication required");
      cleanExpired();
      const code = String(message.code || "");
      const requestedRole = message.role === "owner" ? "owner" : message.role === "guest" ? "guest" : "";
      const session = sessions.get(code);
      const expected = requestedRole === "owner" ? session?.ownerToken : requestedRole === "guest" ? session?.guestToken : null;
      if (!session || !expected || typeof message.token !== "string" || message.token.length !== expected.length ||
          !crypto.timingSafeEqual(Buffer.from(message.token), Buffer.from(expected))) {
        return ws.close(1008, "Invalid or expired session credentials");
      }
      const room = peers.get(code) || new Map();
      const oldPeer = room.get(requestedRole);
      if (oldPeer && oldPeer !== ws) oldPeer.close(1000, "Reconnected from another tab");
      room.set(requestedRole, ws);
      peers.set(code, room);
      authenticated = true;
      sessionCode = code;
      role = requestedRole;
      clearTimeout(authTimeout);
      send(ws, { type: "authenticated", role, session: safeSession(session) });
      broadcastStatus(code);
      return;
    }
    const session = sessions.get(sessionCode);
    if (!session) return ws.close(1008, "Session expired");
    if (!["offer", "answer", "ice-candidate", "hangup"].includes(message.type)) return;
    if (message.type === "offer" && role !== "owner") return;
    if (message.type === "answer" && role !== "guest") return;
    const room = peers.get(sessionCode);
    const otherRole = role === "owner" ? "guest" : "owner";
    const other = room && room.get(otherRole);
    if (message.type === "hangup") {
      send(other, { type: "hangup" });
      return;
    }
    if (message.data && JSON.stringify(message.data).length > 900000) return;
    send(other, { type: message.type, data: message.data });
  });
  ws.on("close", () => {
    clearTimeout(authTimeout);
    if (!authenticated) return;
    const room = peers.get(sessionCode);
    if (room && room.get(role) === ws) {
      room.delete(role);
      if (!room.size) peers.delete(sessionCode);
      else broadcastStatus(sessionCode);
    }
  });
  ws.on("error", () => {});
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});
server.listen(PORT, "0.0.0.0", () => {
  console.log(`KANYI dashboard running on port ${PORT}`);
});

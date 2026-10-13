(() => {
"use strict";
const $ = id => document.getElementById(id);
let code = "", token = "", role = "", socket = null, pc = null, localStream = null, remoteStream = null;
const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
function status(id, message) { $(id).textContent = message; }
function setState(message) { $("screen-state").textContent = message; }
function apiBase() {
  const params = new URLSearchParams(location.search);
  return (params.get("backend") || location.origin).replace(/\/$/, "");
}
async function api(path, options = {}) {
  const response = await fetch(apiBase() + path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The support service could not be reached.");
  return data;
}
function closePeer() {
  if (pc) { pc.onicecandidate = null; pc.ontrack = null; pc.onconnectionstatechange = null; pc.close(); pc = null; }
  remoteStream = null;
  $("remote-video").srcObject = null;
}
function closeSocket() {
  if (socket) { socket.onclose = null; socket.close(); socket = null; }
}
function resetButtons() {
  $("start-share").disabled = role !== "owner" || !socket || socket.readyState !== WebSocket.OPEN || !localStream;
  $("stop-share").disabled = !localStream;
  $("end-owner").disabled = !code;
  $("end-guest").disabled = !code;
}
function connectSocket() {
  return new Promise((resolve, reject) => {
    const url = apiBase().replace(/^http/, "ws") + "/ws";
    socket = new WebSocket(url);
    const timeout = setTimeout(() => { reject(new Error("Timed out connecting to the support service.")); closeSocket(); }, 8000);
    socket.onopen = () => socket.send(JSON.stringify({ type: "auth", code, token, role }));
    socket.onmessage = async event => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      try {
        if (message.type === "authenticated") {
          clearTimeout(timeout); status(role === "owner" ? "owner-status" : "guest-status", "Secure signaling connected. Waiting for the other browser.");
          resetButtons(); resolve();
        } else if (message.type === "peer-status") {
          const text = message.ownerConnected && message.guestConnected ? "Both browsers connected. The screen owner can start sharing." : "Connected to service; waiting for the other browser to connect.";
          status(role === "owner" ? "owner-status" : "guest-status", text);
        } else if (message.type === "offer" && role === "guest") {
          await ensurePeer();
          await pc.setRemoteDescription(message.data);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.send(JSON.stringify({ type: "answer", data: pc.localDescription }));
        } else if (message.type === "answer" && role === "owner" && pc) {
          await pc.setRemoteDescription(message.data);
        } else if (message.type === "ice-candidate" && pc && message.data) {
          try { await pc.addIceCandidate(message.data); } catch (e) { console.warn("ICE candidate skipped", e); }
        } else if (message.type === "hangup") {
          closePeer(); status(role === "owner" ? "owner-status" : "guest-status", "Screen share ended by the other participant."); setState("Share ended");
        } else if (message.type === "session-ended") {
          stopSharing(false); closePeer(); closeSocket(); code = ""; token = ""; role = ""; resetButtons(); setState("Session ended");
          status("owner-status", "The support session has ended."); status("guest-status", "The support session has ended.");
        }
      } catch (error) { status(role === "owner" ? "owner-status" : "guest-status", error.message || "Could not establish screen sharing."); }
    };
    socket.onerror = () => { clearTimeout(timeout); reject(new Error("Cannot connect to the real-time service. Check the backend URL and deployment.")); };
    socket.onclose = event => {
      clearTimeout(timeout);
      if (code) status(role === "owner" ? "owner-status" : "guest-status", event.reason || "Signaling connection closed.");
      resetButtons();
    };
  });
}
async function ensurePeer() {
  if (pc) return pc;
  pc = new RTCPeerConnection({ iceServers });
  pc.onicecandidate = event => {
    if (event.candidate && socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "ice-candidate", data: event.candidate }));
  };
  pc.ontrack = event => {
    remoteStream = event.streams[0];
    $("remote-video").srcObject = remoteStream;
    setState("Receiving screen stream");
  };
  pc.onconnectionstatechange = () => {
    if (pc && ["failed", "disconnected", "closed"].includes(pc.connectionState)) setState("Screen connection " + pc.connectionState);
  };
  if (role === "owner" && localStream) localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  return pc;
}
$("create").addEventListener("click", async () => {
  $("create").disabled = true;
  try {
    const data = await api("/api/pair/create", { method: "POST", body: JSON.stringify({ deviceName: $("owner-name").value.trim() }) });
    code = data.session.code; token = data.token; role = "owner";
    $("owner-code").textContent = code; $("owner-code-wrap").classList.remove("hidden");
    status("owner-status", "Code created. Give it only to the person you want to support with."); setState("Waiting for the other browser");
    await connectSocket(); resetButtons();
  } catch (error) { status("owner-status", error.message); code = ""; token = ""; role = ""; }
  finally { $("create").disabled = false; }
});
$("copy").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("owner-code").textContent); status("owner-status", "Pairing code copied. Share it privately."); }
  catch { status("owner-status", "Copy unavailable. Copy the six digits manually."); }
});
$("join-code").addEventListener("input", () => { $("join-code").value = $("join-code").value.replace(/\D/g, "").slice(0, 6); });
$("join").addEventListener("click", async () => {
  $("join").disabled = true;
  try {
    const data = await api("/api/pair/join", { method: "POST", body: JSON.stringify({ code: $("join-code").value, deviceName: $("guest-name").value.trim() }) });
    code = data.session.code; token = data.token; role = "guest";
    await connectSocket(); status("guest-status", "Securely connected. Waiting for the owner to start screen sharing."); setState("Waiting for approved share"); resetButtons();
  } catch (error) { status("guest-status", error.message); closeSocket(); code = ""; token = ""; role = ""; }
  finally { $("join").disabled = false; }
});
$("start-share").addEventListener("click", async () => {
  if (role !== "owner" || !code) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    status("owner-status", "This browser does not support screen sharing. Try a current desktop browser."); return;
  }
  try {
    // The browser displays its own screen/window picker and permission prompt.
    localStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    $("start-share").disabled = true; $("stop-share").disabled = false;
    localStream.getVideoTracks()[0].addEventListener("ended", () => stopSharing(true), { once: true });
    $("remote-video").srcObject = localStream; setState("Sharing preview on owner device");
    await ensurePeer();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.send(JSON.stringify({ type: "offer", data: pc.localDescription }));
    status("owner-status", "Screen sharing is active. Use Stop sharing or your browser's share indicator to end it.");
  } catch (error) {
    if (error.name === "NotAllowedError") status("owner-status", "Screen sharing cancelled. No screen was shared.");
    else status("owner-status", error.message || "Could not start screen sharing.");
    stopSharing(false);
  }
});
function stopSharing(notify = true) {
  if (notify && socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "hangup" }));
  if (localStream) { localStream.getTracks().forEach(track => track.stop()); localStream = null; }
  closePeer();
  $("remote-video").srcObject = null; setState("Waiting for an approved screen share"); resetButtons();
}
$("stop-share").addEventListener("click", () => {
  stopSharing(true); status("owner-status", "Screen sharing stopped.");
});
async function endSession(owner) {
  if (code && role === "owner") {
    try { await api("/api/pair/" + encodeURIComponent(code) + "/leave", { method: "POST", body: "{}" }); } catch {}
  } else if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "hangup" }));
  }
  stopSharing(false); closeSocket(); code = ""; token = ""; role = ""; resetButtons();
  $("owner-code-wrap").classList.add("hidden"); setState("Session ended");
  status(owner ? "owner-status" : "guest-status", "You disconnected from the support session.");
}
$("end-owner").addEventListener("click", () => endSession(true));
$("end-guest").addEventListener("click", () => endSession(false));
window.addEventListener("beforeunload", () => { stopSharing(true); closeSocket(); });
})();
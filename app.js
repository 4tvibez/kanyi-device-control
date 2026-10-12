const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "public");

app.disable("x-powered-by");
app.use(express.static(publicDir));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", app: "KANYI Device Control", mode: "demo" });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`KANYI dashboard running on port ${PORT}`);
});
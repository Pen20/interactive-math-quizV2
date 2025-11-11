// server/index.js
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import openaiRouter from "./openaiRouter.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, ".."); // project root

const app = express();

/* ---------- security & performance ---------- */
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: false, // relax CSP; tighten later if desired
  })
);
app.use(compression());

// During development allow any origin; set FRONTEND_ORIGIN in prod.
const ORIGIN = process.env.FRONTEND_ORIGIN || true; // e.g. "https://yourdomain.com"
app.use(cors({ origin: ORIGIN }));

// Limit body size (protects your OpenAI proxy)
app.use(express.json({ limit: "200kb" }));

/* ---------- static assets ---------- */
app.use(
  "/css",
  express.static(path.join(ROOT, "css"), { maxAge: "1d", etag: true })
);
app.use(
  "/js",
  express.static(path.join(ROOT, "js"), { maxAge: "1d", etag: true })
);
app.use(
  "/assets",
  express.static(path.join(ROOT, "assets"), { maxAge: "7d", etag: true })
);

/* ---------- API (rate-limited) ---------- */
const openaiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/openai", openaiLimiter, openaiRouter);

/* ---------- pages ---------- */
// Home page
app.get("/", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.join(ROOT, "index.html"));
});

// Catch-all for anything under /html (supports nested folders/files)
app.get(/^\/html\/(.+)$/, (req, res) => {
  // the first capture group from the regex
  const rel = (req.params[0] || "").replace(/^(\.\.(\/|\\|$))+/g, ""); // strip leading ../
  const safeRel = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/g, "");

  // absolute path inside the html folder
  let abs = path.join(ROOT, "html", safeRel);

  // if it's a directory, serve its index.html
  try {
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
      abs = path.join(abs, "index.html");
    }
  } catch (e) {
    // ignore; will 404 below
  }

  // final safety: ensure we’re still under ROOT/html
  const htmlRoot = path.join(ROOT, "html") + path.sep;
  if (!abs.startsWith(htmlRoot)) return res.status(400).send("Bad path");

  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
    res.setHeader("Cache-Control", "no-cache");
    return res.sendFile(abs);
  }
  return res.status(404).send("Not Found");
});

// Health check
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// 404 handler
app.use((_req, res) => {
  res.status(404).send("Not Found");
});

// Centralized error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 3080;
// Bind to 0.0.0.0 so phones on the same network can access it
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

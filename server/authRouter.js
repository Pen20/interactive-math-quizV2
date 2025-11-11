import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const USERS_FILE = path.join(ROOT, "server", "users.json");

function readUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

function generateToken(payload) {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyToken(req, res, next) {
  const auth = req.headers.authorization || "";
  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer")
    return res.status(401).json({ error: "Missing token" });

  const token = parts[1];
  try {
    const secret = process.env.JWT_SECRET || "dev-secret";
    const data = jwt.verify(token, secret);
    req.user = data;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Signup: { email, password, name }
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Missing email or password" });

    const users = readUsers();
    if (users.find((u) => u.email === email)) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = { id: uuidv4(), email, name: name || "", password: hashed, createdAt: new Date().toISOString() };
    users.push(newUser);
    writeUsers(users);

    const token = generateToken({ id: newUser.id, email: newUser.email });
    return res.json({ token, user: { id: newUser.id, email: newUser.email, name: newUser.name } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

// Login: { email, password }
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Missing email or password" });

    const users = readUsers();
    const user = users.find((u) => u.email === email);
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password || "");
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });

    const token = generateToken({ id: user.id, email: user.email });
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

// Me
router.get("/me", (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const parts = auth.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer")
      return res.status(401).json({ error: "Missing token" });
    try {
      const secret = process.env.JWT_SECRET || "dev-secret";
      const data = jwt.verify(parts[1], secret);
      const users = readUsers();
      const user = users.find((u) => u.id === data.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json({ user: { id: user.id, email: user.email, name: user.name } });
    } catch (e) {
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

export default router;

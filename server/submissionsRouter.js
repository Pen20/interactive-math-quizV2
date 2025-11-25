import express from 'express';
import { supabase } from './supabaseClient.js';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const USERS_FILE = path.join(ROOT, 'server', 'users.json');

function readUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

// Helper to parse optional JWT token (same secret as authRouter)
function tryParseToken(req) {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  try {
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const data = jwt.verify(parts[1], secret);
    return data; // e.g. { id, email, name }
  } catch (e) {
    return null;
  }
}

// POST /api/submissions
// Expects a JSON body with fields such as:
// { question, course, questionId, timeOpen, timeSubmitted, userAnswer, reasoningSteps, aiFeedback, correctness, metadata }
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};

    // Basic validation
    const {
      question = '',
      course = '',
      questionId = null,
      timeOpen = null,
      timeSubmitted = null,
      userAnswer = '',
      reasoningSteps = '',
      aiFeedback = null,
      correctness = '',
      metadata = {},
    } = body;

    // attach user info from token if available
    const user = tryParseToken(req);

    // If we have a user ID but no name in token, look it up in users.json
    let username = user?.name || body.username || null;
    const userId = user?.id || body.userId || null;
    const userEmail = user?.email || body.email || null;

    if (userId && !username) {
      const users = readUsers();
      const userRecord = users.find(u => u.id === userId);
      if (userRecord?.name) {
        username = userRecord.name;
      }
    }

    // ensure ai_feedback and metadata are objects (so Supabase stores them as JSONB)
    function tryParseJSON(value) {
      if (value == null) return null;
      if (typeof value === 'object') return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          // not a JSON string — wrap as summary field
          return { summary: value };
        }
      }
      // other primitives
      return { value };
    }

    const aiFeedbackObj = tryParseJSON(aiFeedback) || {};
    const metadataObj = tryParseJSON(metadata) || {};

    const record = {
      question,
      course,
      question_id: questionId,
      time_open: timeOpen ? new Date(timeOpen).toISOString() : null,
      time_submitted: timeSubmitted ? new Date(timeSubmitted).toISOString() : new Date().toISOString(),
      duration_ms: timeOpen && timeSubmitted ? (Number(timeSubmitted) - Number(timeOpen)) : null,
      user_answer: userAnswer,
      reasoning_steps: reasoningSteps,
      ai_feedback: aiFeedbackObj,
      correctness: correctness || null,
      username,
      email: userEmail,
      user_id: userId,
      metadata: metadataObj,
      created_at: new Date().toISOString(),
    };

    // Insert into Supabase
    const { data, error } = await supabase.from('submissions').insert([record]).select();
    if (error) {
      console.error('Supabase insert error', error);
      return res.status(500).json({ error: 'Database insert failed', detail: error.message || error });
    }

    return res.json({ ok: true, record: data?.[0] || null });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
});

export default router;

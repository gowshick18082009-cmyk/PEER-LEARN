import express from 'express';
import rateLimit from 'express-rate-limit';
import db from '../db.js';
import { fail } from '../http.js';
import { authRequired, hashPassword, comparePasswords, signToken } from '../auth.js';

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

function isSupportedAvatar(dataUrl) {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) return false;

  const image = Buffer.from(match[2], 'base64');
  if (image.length === 0 || image.length > 512 * 1024) return false;

  if (match[1] === 'png') {
    return image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (match[1] === 'jpeg') {
    return image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
  }
  return image.length >= 12
    && image.toString('ascii', 0, 4) === 'RIFF'
    && image.toString('ascii', 8, 12) === 'WEBP';
}

router.use(authLimiter);

router.post('/signup', async (req, res) => {
  const { name, email, password, agreed } = req.body || {};
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanPassword = typeof password === 'string' ? password : '';

  if (cleanName.length < 1 || cleanName.length > 60) {
    return fail(res, 'Name must be 1-60 characters.', 400);
  }
  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return fail(res, 'Enter a valid email address.', 400);
  }
  if (cleanPassword.length < 8) {
    return fail(res, 'Password must be at least 8 characters.', 400);
  }
  if (agreed !== true) {
    return fail(res, 'You must agree to the community rules.', 400);
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    return fail(res, 'An account with this email already exists.', 409);
  }

  try {
    const passwordHash = await hashPassword(cleanPassword);
    const result = db.prepare("INSERT INTO users (name, email, password_hash, bio, points, role, suspended) VALUES (?, ?, ?, ?, 20, 'student', 0)").run(cleanName, cleanEmail, passwordHash, '');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = signToken(user);
    return res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error('Signup error:', error);
    return fail(res, 'Unable to create account.', 500);
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanPassword = typeof password === 'string' ? password : '';

  if (!cleanEmail || !cleanPassword) {
    return fail(res, 'Incorrect email or password.', 401);
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
  if (!user) {
    return fail(res, 'Incorrect email or password.', 401);
  }

  const matches = await comparePasswords(cleanPassword, user.password_hash);
  if (!matches) {
    return fail(res, 'Incorrect email or password.', 401);
  }
  if (Number(user.suspended) === 1) {
    return fail(res, 'Your account is suspended.', 403);
  }

  const token = signToken(user);
  return res.json({ token, user: sanitizeUser(user) });
});

router.get('/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return fail(res, 'User not found.', 404);
  }
  return res.json({ user: sanitizeUser(user) });
});

router.patch('/profile', authRequired, (req, res) => {
  const body = req.body || {};
  const updates = [];
  const values = [];

  if (Object.hasOwn(body, 'avatarData')) {
    const { avatarData } = body;
    if (avatarData !== null && (typeof avatarData !== 'string' || !isSupportedAvatar(avatarData))) {
      return fail(res, 'Choose a valid PNG, JPEG, or WebP image up to 512 KB.', 400);
    }
    updates.push('avatar_data = ?');
    values.push(avatarData);
  }

  if (Object.hasOwn(body, 'bio')) {
    if (typeof body.bio !== 'string' || body.bio.trim().length > 240) {
      return fail(res, 'Bio must be 240 characters or fewer.', 400);
    }
    updates.push('bio = ?');
    values.push(body.bio.trim());
  }

  if (updates.length === 0) {
    return fail(res, 'Provide a bio or avatar update.', 400);
  }

  values.push(req.user.id);
  const result = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  if (result.changes === 0) {
    return fail(res, 'User not found.', 404);
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  return res.json({ user: sanitizeUser(user) });
});

export default router;

import bcrypt from 'bcryptjs';
import { query } from '../db/index.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../services/tokenService.js';

// ─── REGISTER ───────────────────────────────────────────
export async function register(req, res) {
  const { email, password } = req.body;

  // 1. Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    // 2. Check if email already exists
    const existing = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // 3. Hash password — salt rounds = 12
    const password_hash = await bcrypt.hash(password, 12);

    // 4. Insert user
    const result = await query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [email, password_hash]
    );
    const user = result.rows[0];

    // 5. Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // 6. Return response
    return res.status(201).json({
      user: { id: user.id, email: user.email },
      accessToken,
      refreshToken
    });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── LOGIN ──────────────────────────────────────────────
export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    // 1. Find user by email
    const result = await query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    // 2. Generic error — don't reveal whether email exists
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = result.rows[0];

    // 3. Compare password with hash
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 4. Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    return res.json({
      user: { id: user.id, email: user.email },
      accessToken,
      refreshToken
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── REFRESH ────────────────────────────────────────────
export async function refresh(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    // Verify the refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Issue new access token
    const accessToken = generateAccessToken(payload.userId);

    return res.json({ accessToken });

  } catch (err) {
    // jwt.verify throws if expired or invalid
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}

// ─── GET CURRENT USER ───────────────────────────────────
export async function getMe(req, res) {
  try {
    const result = await query(
      `SELECT id, email, cf_handle, comfort_zone_rating,
              current_streak, longest_streak, created_at
       FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: result.rows[0] });

  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
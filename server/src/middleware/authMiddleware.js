import { verifyAccessToken } from '../services/tokenService.js';

export function authenticate(req, res, next) {
  // 1. Get token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 2. Verify token — throws if invalid or expired
    const payload = verifyAccessToken(token);

    // 3. Attach user info to request
    req.user = payload;

    // 4. Continue to route handler
    next();

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
import { Router } from 'express';
import { register, login, refresh, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/me', authenticate, getMe);  // protected route

export default router;
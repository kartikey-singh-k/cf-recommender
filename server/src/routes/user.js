import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { linkHandle, syncSubmissions, getProfile, getPublicProfile,getRatingHistory } from '../controllers/userController.js';


const router = Router();
router.get('/public/:handle', getPublicProfile);
// All user routes require authentication
router.use(authenticate);

router.post('/handle', linkHandle);
router.post('/sync', syncSubmissions);
router.get('/profile', getProfile);

router.get('/rating-history', getRatingHistory);
export default router;
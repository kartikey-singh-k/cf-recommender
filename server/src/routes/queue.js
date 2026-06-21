import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getQueue, regenerateQueue, markSolved } from '../controllers/queueController.js';

const router = Router();

router.use(authenticate);

router.get('/today', getQueue);
router.post('/regenerate', regenerateQueue);
router.post('/solved', markSolved);

export default router;
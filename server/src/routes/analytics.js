import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getTagStats,
  getComfortZone,
  getStreak,
  getOverview
} from '../controllers/analyticsController.js';

const router = Router();

router.use(authenticate);

router.get('/tags', getTagStats);
router.get('/comfort-zone', getComfortZone);
router.get('/streak', getStreak);
router.get('/overview', getOverview);

export default router;
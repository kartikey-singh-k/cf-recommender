import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getWeaknessReport,
  getPracticePlan,
  getHint
} from '../controllers/aiController.js';

const router = Router();

router.use(authenticate);

router.get('/weakness-report', getWeaknessReport);
router.post('/practice-plan', getPracticePlan);
router.post('/hint', getHint);

export default router;
import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  addFriend,
  getFriends,
  removeFriend,
  compareWithFriend
} from '../controllers/friendController.js';

const router = Router();

router.use(authenticate);

router.get('/', getFriends);
router.post('/', addFriend);
router.delete('/:friendId', removeFriend);
router.get('/compare/:friendId', compareWithFriend);

export default router;
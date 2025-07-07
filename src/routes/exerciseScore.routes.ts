import Router from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { getExerciseScore } from '../controllers/exerciseScore.controller';

const router = Router();

router.post('/getExerciseScore', authenticateToken, getExerciseScore);

export default router;
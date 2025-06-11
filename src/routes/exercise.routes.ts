import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {createExercise} from "../controllers/exercise.controller";


const router = Router();

router.post('/createExercise', authenticateToken, createExercise);

export default router;

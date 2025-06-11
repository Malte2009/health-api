import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {createTraining} from "../controllers/training.controller";

const router = Router();

router.post('/createTraining', authenticateToken, createTraining);

export default router;

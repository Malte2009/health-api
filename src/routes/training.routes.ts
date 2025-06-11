import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {createTraining, getTrainingLogById, getTrainingLogs} from "../controllers/training.controller";

const router = Router();

router.get("/getTrainingLogs", authenticateToken, getTrainingLogs);
router.get("/getTrainingLog/:id", authenticateToken, getTrainingLogById);
router.post('/createTraining', authenticateToken, createTraining);

export default router;

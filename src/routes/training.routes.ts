import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {createTraining, getTrainingLogById, getTrainingLogs, updateTraining} from "../controllers/training.controller";

const router = Router();

router.get("/getTrainingLogs", authenticateToken, getTrainingLogs);
router.get("/getTrainingLog/:id", authenticateToken, getTrainingLogById);
router.patch("/updateTrainingLog/:id", authenticateToken, updateTraining);
router.post('/createTraining', authenticateToken, createTraining);

export default router;

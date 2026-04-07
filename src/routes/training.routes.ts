import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {
    createTraining,
    getTrainingById,
    getTrainingLogsWithExercises,
    updateTraining,
    deleteTrainingLog, getTrainingNames, recalculateTrainingCalories, getTrainingLogs,
} from "../controllers/training.controller";

const router = Router();


router.get("/getTrainingLogs", authenticateToken, getTrainingLogs as any);
router.get("/getTrainingLogsWithExercises", authenticateToken, getTrainingLogsWithExercises as any);
router.get("/getTraining/:id", authenticateToken, getTrainingById as any);
router.get("/getTrainingNames", authenticateToken, getTrainingNames as any);
router.get("/recalculateTrainingCalories", authenticateToken, recalculateTrainingCalories as any);
router.patch("/updateTraining/:id", authenticateToken, updateTraining as any);
router.post('/createTraining', authenticateToken, createTraining as any);
router.delete('/deleteTraining/:id', authenticateToken, deleteTrainingLog as any);

export default router;

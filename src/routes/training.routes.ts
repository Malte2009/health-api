import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {
    createTraining,
    getTrainingById,
    getTraining,
    getTrainingByDate,
    updateTraining,
    deleteTraining
} from "../controllers/training.controller";

const router = Router();

router.get("/getTraining", authenticateToken, getTraining);
router.get("/getTraining/:id", authenticateToken, getTrainingById);
router.get("/getTrainingByDate", authenticateToken, getTrainingByDate);
router.patch("/updateTraining/:id", authenticateToken, updateTraining);
router.post('/createTraining', authenticateToken, createTraining);
router.delete('/deleteTraining/:id', authenticateToken, deleteTraining)

export default router;

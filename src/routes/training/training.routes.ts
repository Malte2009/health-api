import {Router} from 'express';
import {authenticateToken} from "../../middleware/auth.middleware";
import {
    createTraining,
    getTrainingById,
    getTraining,
    updateTraining,
    deleteTraining, getTrainingNames, recalculateTrainingCalories,
} from "../../controllers/training/training.controller";

const router = Router();

router.get("/getTraining", authenticateToken, getTraining);
router.get("/getTraining/:id", authenticateToken, getTrainingById);
router.get("/getTrainingNames", authenticateToken, getTrainingNames);
router.get("/recalculateTrainingCalories", authenticateToken, recalculateTrainingCalories);
router.patch("/updateTraining/:id", authenticateToken, updateTraining);
router.post('/createTraining', authenticateToken, createTraining);
router.delete('/deleteTraining/:id', authenticateToken, deleteTraining);

export default router;

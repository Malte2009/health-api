import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {
    createTraining,
    getTrainingById,
    getTraining,
    updateTraining,
    deleteTraining, getTrainingNames,
} from "../controllers/training.controller";

const router = Router();

router.get("/getTraining", authenticateToken, getTraining as any);
router.get("/getTraining/:id", authenticateToken, getTrainingById as any);
router.get("/getTrainingNames", authenticateToken, getTrainingNames as any);
router.patch("/updateTraining/:id", authenticateToken, updateTraining as any);
router.post('/createTraining', authenticateToken, createTraining as any);
router.delete('/deleteTraining/:id', authenticateToken, deleteTraining as any);

export default router;

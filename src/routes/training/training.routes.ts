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

router.get("/", authenticateToken, getTraining);
router.get("/:id", authenticateToken, getTrainingById);
router.get("/names", authenticateToken, getTrainingNames);
router.get("/recalculate-calories", authenticateToken, recalculateTrainingCalories);
router.patch("/:id", authenticateToken, updateTraining);
router.post('/', authenticateToken, createTraining);
router.delete('/:id', authenticateToken, deleteTraining);

export default router;

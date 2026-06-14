import {Router} from 'express';
import {authenticateToken} from "../../middleware/auth.middleware";
import {getExerciseLogById, changeExerciseLog, createExerciseLog, deleteExerciseLog} from "../../controllers/training/exerciseLog.controller";


const router = Router();

router.get("/:id", authenticateToken, getExerciseLogById);
router.patch("/:id", authenticateToken, changeExerciseLog);
router.post('/', authenticateToken, createExerciseLog);
router.delete("/:id", authenticateToken, deleteExerciseLog);

export default router;

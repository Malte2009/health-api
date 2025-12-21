import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {getExerciseLogById, changeExerciseLog, createExerciseLog, deleteExerciseLog} from "../controllers/exerciseLog.controller";


const router = Router();

router.get("/getExerciseLog/:id", authenticateToken, getExerciseLogById);
router.patch("/changeExerciseLog/:id", authenticateToken, changeExerciseLog);
router.post('/createExerciseLog', authenticateToken, createExerciseLog);
router.delete("/deleteExerciseLog/:id", authenticateToken, deleteExerciseLog);

export default router;

import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {getExerciseLogById, changeExerciseLog, createExerciseLog, deleteExerciseLog} from "../controllers/exerciseLog.controller";


const router = Router();

router.get("/getExerciseLog/:id", authenticateToken, getExerciseLogById as any);
router.patch("/changeExerciseLog/:id", authenticateToken, changeExerciseLog as any);
router.post('/createExerciseLog', authenticateToken, createExerciseLog as any);
router.delete("/deleteExerciseLog/:id", authenticateToken, deleteExerciseLog as any);

export default router;

import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {getExerciseById, getExerciseNames, changeExercise, createExercise, deleteExercise} from "../controllers/exercise.controller";


const router = Router();

router.get("/getExerciseNames", authenticateToken, getExerciseNames);
router.get("/getExercise/:id", authenticateToken, getExerciseById);
router.patch("/changeExercise/:id", authenticateToken, changeExercise);
router.post('/createExercise', authenticateToken, createExercise);
router.delete("/deleteExercise/:id", authenticateToken, deleteExercise);

export default router;

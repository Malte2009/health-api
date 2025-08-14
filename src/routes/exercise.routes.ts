import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {getExerciseById, getExerciseNames, changeExerciseInTraining, addExerciseToTraining, deleteExerciseFromTraining} from "../controllers/exercise.controller";


const router = Router();

router.get("/getExerciseNames", authenticateToken, getExerciseNames);
router.get("/getExercise/:id", authenticateToken, getExerciseById);
router.patch("/changeExerciseInTraining/:id", authenticateToken, changeExerciseInTraining);
router.post('/addExerciseToTraining', authenticateToken, addExerciseToTraining);
router.delete("/deleteExerciseFromTraining/:id", authenticateToken, deleteExerciseFromTraining);

export default router;

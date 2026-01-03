import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {
    changeExercise,
    createExercise,
    deleteExercise,
    getExerciseByName,
    getExerciseNames, getExercises
} from "../controllers/exercise.controller";

const router = Router();

router.get("/getExercises", authenticateToken, getExercises as any);
router.get("/getExerciseNames", authenticateToken, getExerciseNames as any);
router.get("/getExercise/:name", authenticateToken, getExerciseByName as any);
router.post("/createExercise", authenticateToken, createExercise as any);
router.patch("/changeExercise/:name", authenticateToken, changeExercise as any);
router.delete("/deleteExercise/:name", authenticateToken, deleteExercise as any);

export default router;

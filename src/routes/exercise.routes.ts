import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {
    changeExercise,
    createExercise,
    deleteExercise,
    getExerciseByName,
    getExerciseNames
} from "../controllers/exercise.controller";

const router = Router();

router.get("/getExerciseNames", authenticateToken, getExerciseNames);
router.get("/getExercise/:name", authenticateToken, getExerciseByName);
router.post("/createExercise", authenticateToken, createExercise);
router.patch("/changeExercise/:name", authenticateToken, changeExercise);
router.delete("/deleteExercise/:name", authenticateToken, deleteExercise);

export default router;

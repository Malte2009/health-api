import {Router} from 'express';
import {authenticateToken} from "../../middleware/auth.middleware";
import {
    changeExercise,
    createExercise,
    deleteExercise,
    getExerciseByName,
    getExerciseNames, getExercises
} from "../../controllers/training/exercise.controller";

const router = Router();

router.get("/", authenticateToken, getExercises);
router.get("/names", authenticateToken, getExerciseNames);
router.get("/:name", authenticateToken, getExerciseByName);
router.post("/", authenticateToken, createExercise);
router.patch("/:name", authenticateToken, changeExercise);
router.delete("/:name", authenticateToken, deleteExercise);

export default router;

import {Router} from 'express';
import {authenticateToken} from "../../middleware/auth.middleware";
import ExerciseController from "../../controllers/training/exercise.controller";

const router = Router();

router.use(authenticateToken);

router.get("/", ExerciseController.getExercises);
router.get("/names", ExerciseController.getExerciseNames);
router.post("/", ExerciseController.createExercise);
router.get("/:id", ExerciseController.getExerciseById);
router.patch("/:id", ExerciseController.updateExercise);
router.delete("/:id", ExerciseController.deleteExercise);

export default router;

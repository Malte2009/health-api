import { Router } from "express";
import WorkoutExerciseController from "../../controllers/training/workoutExercise.controller";
import {authenticateToken} from "../../middleware/auth.middleware";

const router = Router({ mergeParams: true });

router.use(authenticateToken);

router.get("/", WorkoutExerciseController.getWorkoutExercises);
router.post("/", WorkoutExerciseController.createWorkoutExercise);
router.get("/:workoutExerciseId", WorkoutExerciseController.getWorkoutExerciseById);
router.patch("/:workoutExerciseId", WorkoutExerciseController.updateWorkoutExercise);
router.delete("/:workoutExerciseId", WorkoutExerciseController.deleteWorkoutExercise);

export default router;

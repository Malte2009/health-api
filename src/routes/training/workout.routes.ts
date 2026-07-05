import {Router} from 'express';
import {authenticateToken} from "../../middleware/auth.middleware";
import WorkoutController from "../../controllers/training/workout.controller";

const router = Router() as any;

router.use(authenticateToken);

router.get("/", WorkoutController.getWorkouts);
router.get("/names", WorkoutController.getWorkoutNames);
router.post("/", WorkoutController.createWorkout);
router.get("/:workoutId", WorkoutController.getWorkoutById);
router.patch("/:workoutId", WorkoutController.updateWorkout);
router.delete("/:workoutId", WorkoutController.deleteWorkout);

export default router;

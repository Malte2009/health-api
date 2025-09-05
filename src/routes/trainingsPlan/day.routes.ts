import {Router} from 'express';
import {authenticateToken} from "../../middleware/auth.middleware";
import { addExerciseToDay, createDay, getDaysByTrainingPlanId, deleteExerciseFromDay, deleteDay, deleteExercise } from '../../controllers/trainingsPlan/day.controller';

const router = Router();

router.get("/getDaysByTrainingPlanId/:trainingPlanId", authenticateToken, getDaysByTrainingPlanId);
router.post("/createDay", authenticateToken, createDay);
router.patch("/addExerciseToDay", authenticateToken, addExerciseToDay);
router.delete("/deleteExerciseFromDay/:dayId/:exerciseId", authenticateToken, deleteExerciseFromDay);
router.delete("/deleteDay/:id", authenticateToken, deleteDay);
router.delete("/deleteExercise/:id", authenticateToken, deleteExercise);

export default router;
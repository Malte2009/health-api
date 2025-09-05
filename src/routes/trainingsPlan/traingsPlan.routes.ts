import {Router} from 'express';
import {authenticateToken} from "../../middleware/auth.middleware";
import { createTrainingPlan, deleteTrainingPlan, getTrainingPlans, getTrainingPlanById, updateTrainingPlan } from '../../controllers/trainingsPlan/trainingsPlan.controller';


const router = Router()

router.get("/getTrainingPlans", authenticateToken, getTrainingPlans)
router.get("/getTrainingPlan/:id", authenticateToken, getTrainingPlanById)
router.post("/createTrainingPlan", authenticateToken, createTrainingPlan)
router.patch("/updateTrainingPlan/:id", authenticateToken, updateTrainingPlan)
router.delete("/deleteTrainingPlan/:id", authenticateToken, deleteTrainingPlan)

export default router
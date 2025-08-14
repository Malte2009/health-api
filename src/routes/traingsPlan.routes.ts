import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import { createTrainingsPlan, deleteTrainingsPlan, getTrainingsPlan, getTrainingsPlanById, updateTrainingsPlan } from '../controllers/trainingsPlan.controller';


const router = Router()

router.get("/getTrainingsPlan", authenticateToken, getTrainingsPlan)
router.get("/getTrainingsPlan/:id", authenticateToken, getTrainingsPlanById)
router.post("/createTrainingsPlan", authenticateToken, createTrainingsPlan)
router.patch("/updateTrainingsPlan/:id", authenticateToken, updateTrainingsPlan)
router.delete("/deleteTrainingsPlan/:id", authenticateToken, deleteTrainingsPlan)

export default router
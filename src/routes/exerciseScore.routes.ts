import {getExerciseScoresByName} from "../controllers/exerciseScore.controller";
import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";

const router = Router();

router.get("/getExerciseScores/:name", authenticateToken, getExerciseScoresByName as any);

export default router;
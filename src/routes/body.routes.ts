import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {createBodyLog, getCaloriesBurnedOnDay} from "../controllers/body.controller";


const router = Router();

router.get('/getCaloriesBurnedOnDay', authenticateToken, getCaloriesBurnedOnDay as any);
router.post('/createBodyLog', authenticateToken, createBodyLog as any);

export default router;

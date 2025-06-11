import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {createBodyLog, getCaloriesBurnedOnDay} from "../controllers/body.controller";


const router = Router();

router.get('/getCaloriesBurnedOnDay', authenticateToken, getCaloriesBurnedOnDay);
router.post('/createBodyLog', authenticateToken, createBodyLog);

export default router;

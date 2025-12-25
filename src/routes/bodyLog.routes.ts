import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {
    createBodyLog, deleteBodyLog,
    getBodyLogById,
    getBodyLogs,
    getCaloriesBurnedOnDay,
    updateBodyLog
} from "../controllers/bodyLog.controller";


const router = Router();

router.get("/getBodyLogs", authenticateToken, getBodyLogs as any);
router.get("/getBodyLog/:id", authenticateToken, getBodyLogById as any);
router.get('/getCaloriesBurnedOnDay', authenticateToken, getCaloriesBurnedOnDay as any);
router.patch("/updateBodyLog/:id", authenticateToken, updateBodyLog as any);
router.post('/createBodyLog', authenticateToken, createBodyLog as any);
router.delete("/deleteBodyLog/:id", authenticateToken, deleteBodyLog as any);

export default router;

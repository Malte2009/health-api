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

router.get("/getBodyLogs", authenticateToken, getBodyLogs);
router.get("/getBodyLog/:id", authenticateToken, getBodyLogById);
router.get('/getCaloriesBurnedOnDay', authenticateToken, getCaloriesBurnedOnDay);
router.patch("/updateBodyLog/:id", authenticateToken, updateBodyLog);
router.post('/createBodyLog', authenticateToken, createBodyLog);
router.delete("/deleteBodyLog/:id", authenticateToken, deleteBodyLog);

export default router;

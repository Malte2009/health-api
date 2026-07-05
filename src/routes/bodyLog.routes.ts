import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {
    createBodyLog, deleteBodyLog,
    getBodyLogById,
    getBodyLogs,
    getCaloriesBurnedOnDay,
    updateBodyLog
} from "../controllers/bodyLog.controller";


const router = Router() as any;

router.get("/", authenticateToken, getBodyLogs);
router.get("/:id", authenticateToken, getBodyLogById);
router.get('/calories-burned-on-day', authenticateToken, getCaloriesBurnedOnDay);
router.patch("/:id", authenticateToken, updateBodyLog);
router.post('/', authenticateToken, createBodyLog);
router.delete("/:id", authenticateToken, deleteBodyLog);

export default router;

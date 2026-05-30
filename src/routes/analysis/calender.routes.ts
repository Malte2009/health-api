import { Router } from "express";
import {authenticateToken} from "../../middleware/auth.middleware";
import {
    getMicroConsumptionOverMonth,
    getSymptomsOverMonth,
    getSyncopesOverMonth,
    getBloodPressureOverMonth,
    getSleepOverMonth,
    getTrainingOverMonth,
    getDailyLogsOverMonth,
    getIntakeLogsOverMonth
} from "../../controllers/analysis/calender.controller";

const router = Router();

router.use(authenticateToken);

router.get('/microOverMonth', getMicroConsumptionOverMonth as any);
router.get('/symptomsOverMonth', getSymptomsOverMonth as any);
router.get('/syncopesOverMonth', getSyncopesOverMonth as any);
router.get('/bloodPressureOverMonth', getBloodPressureOverMonth as any);
router.get('/sleepOverMonth', getSleepOverMonth as any);
router.get('/trainingOverMonth', getTrainingOverMonth as any);
router.get('/dailyLogsOverMonth', getDailyLogsOverMonth as any);
router.get('/intakeLogsOverMonth', getIntakeLogsOverMonth as any);

export default router;
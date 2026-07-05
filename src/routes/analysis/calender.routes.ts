import { Router } from "express";
import {authenticateToken} from "../../middleware/auth.middleware";
import {
    getFoodOverMonth,
    getMicroConsumptionOverMonth,
    getSymptomsOverMonth,
    getSyncopesOverMonth,
    getBloodPressureOverMonth,
    getSleepOverMonth,
    getTrainingOverMonth,
    getDailyLogsOverMonth,
    getIntakeLogsOverMonth
} from "../../controllers/analysis/calender.controller";

const router = Router() as any;

router.use(authenticateToken);

router.get('/foodOverMonth', getFoodOverMonth);
router.get('/microOverMonth', getMicroConsumptionOverMonth);
router.get('/symptomsOverMonth', getSymptomsOverMonth);
router.get('/syncopesOverMonth', getSyncopesOverMonth);
router.get('/bloodPressureOverMonth', getBloodPressureOverMonth);
router.get('/sleepOverMonth', getSleepOverMonth);
router.get('/workoutsOverMonth', getTrainingOverMonth);
router.get('/dailyLogsOverMonth', getDailyLogsOverMonth);
router.get('/intakeLogsOverMonth', getIntakeLogsOverMonth);

export default router;

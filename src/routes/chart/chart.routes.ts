import { Router } from "express";
import { authenticateToken } from "../../middleware/auth.middleware";
import ChartController from "../../controllers/chart/chart.controller";

const router = Router() as any;

router.use(authenticateToken);

router.get("/datapoints", ChartController.getDataPoints);
router.post("/series", ChartController.getSeries);

export default router;

import { Router } from "express";
import { authenticateToken } from "../../middleware/auth.middleware";
import HealthDayController from "../../controllers/daily/healthDay.controller";

const router = Router();

router.use(authenticateToken);

router.get("/", HealthDayController.getHealthDays);
router.post("/", HealthDayController.createHealthDay);
router.get("/date/:date", HealthDayController.getHealthDayByDate);
router.get("/:id", HealthDayController.getHealthDayById);
router.patch("/:id", HealthDayController.updateHealthDay);
router.put("/:id", HealthDayController.updateHealthDay);
router.delete("/:id", HealthDayController.deleteHealthDay);

export default router;

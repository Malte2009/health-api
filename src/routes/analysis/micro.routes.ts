import { Router } from "express";
import {authenticateToken} from "../../middleware/auth.middleware";
import {getMicroOverTime} from "../../controllers/analysis/micro.controller";

const router = Router();

router.use(authenticateToken);

router.get("/:micro", authenticateToken, getMicroOverTime);

export default router;
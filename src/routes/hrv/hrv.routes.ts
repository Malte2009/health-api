import {Router} from "express";
import {authenticateToken} from "../../middleware/auth.middleware";
import {
    changeHrvRecording,
    deleteHrvRecording,
    getHrvRecording,
    getHrvRecordingById,
    postHrvRecording,
    getHrvData,
    getHrvWindowData,
    getHrvMetricsForRecording
} from "../../controllers/hrv/hrv.controller";

const router = Router();

router.use(authenticateToken);

router.get("/getHrvRecording", getHrvRecording as any)
router.get("/getHrvRecording/:id", getHrvRecordingById as any)
router.get("/getHrvData/:id", getHrvData as any)
router.get("/getHrvWindowData/:id", getHrvWindowData as any)
router.get("/getHrvMetrics/:id", getHrvMetricsForRecording as any)
router.post("/createHrvRecording", postHrvRecording as any)
router.patch("/updateHrvRecording/:id", changeHrvRecording as any)
router.delete("/deleteHrvRecording/:id", deleteHrvRecording as any)

export default router;
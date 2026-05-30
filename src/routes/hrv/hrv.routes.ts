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

router.get("/getHrvRecording", getHrvRecording)
router.get("/getHrvRecording/:id", getHrvRecordingById)
router.get("/getHrvData/:id", getHrvData)
router.get("/getHrvWindowData/:id", getHrvWindowData)
router.get("/getHrvMetrics/:id", getHrvMetricsForRecording)
router.post("/createHrvRecording", postHrvRecording)
router.patch("/updateHrvRecording/:id", changeHrvRecording)
router.delete("/deleteHrvRecording/:id", deleteHrvRecording)

export default router;

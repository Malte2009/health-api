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
    getHrvMetricsForRecording,
    getHrvWindows
} from "../../controllers/hrv/hrv.controller";

const router = Router() as any;

router.use(authenticateToken);

router.get("/", getHrvRecording)
router.get("/:recordingId/windows", getHrvWindows)
router.get("/:id", getHrvRecordingById)
router.get("/data/:id", getHrvData)
router.get("/window-data/:id", getHrvWindowData)
router.get("/metrics/:id", getHrvMetricsForRecording)
router.post("/", postHrvRecording)
router.patch("/:id", changeHrvRecording)
router.delete("/:id", deleteHrvRecording)

export default router;

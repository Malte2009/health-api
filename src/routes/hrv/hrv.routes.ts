import {Router} from "express";
import {authenticateToken} from "../../middleware/auth.middleware";
import {
    deleteHrvRecording,
    getHrvRecording,
    getHrvRecordingById,
    postHrvRecording
} from "../../controllers/hrv/hrv.controller";

const router = Router();

router.use(authenticateToken);

router.get("/getHrvRecording", getHrvRecording as any)
router.get("/getHrvRecording/:id", getHrvRecordingById as any)
router.post("/createHrvRecording", postHrvRecording as any)
router.patch("/updateHrvRecording/:id", postHrvRecording as any)
router.delete("/deleteHrvRecording/:id", deleteHrvRecording as any)

export default router;
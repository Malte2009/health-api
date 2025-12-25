import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {getSetTypes, changeSet, createSet, deleteSet, getSetById, getSetUnits} from "../controllers/set.controller";

const router = Router();


router.get("/getSet/:id", authenticateToken, getSetById as any);
router.get("/getSetTypes", authenticateToken, getSetTypes as any);
router.get("/getSetUnits", authenticateToken, getSetUnits as any);
router.patch("/changeSet/:id", authenticateToken, changeSet as any);
router.post('/createSet', authenticateToken, createSet as any);
router.delete("/deleteSet/:id", authenticateToken, deleteSet as any);

export default router;

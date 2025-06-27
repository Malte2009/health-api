import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {getSetTypes, changeSet, createSet, deleteSet} from "../controllers/set.controller";

const router = Router();


router.get("/getSetTypes", authenticateToken, getSetTypes);
router.patch("/changeSet/:id", authenticateToken, changeSet);
router.post('/createSet', authenticateToken, createSet);
router.delete("/deleteSet/:id", authenticateToken, deleteSet);

export default router;

import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {changeSet, createSet, deleteSet} from "../controllers/set.controller";

const router = Router();

router.patch("/changeSet/:id", authenticateToken, changeSet); // Assuming changeSet is similar to createSet
router.post('/createSet', authenticateToken, createSet);
router.delete("/deleteSet/:id", authenticateToken, deleteSet);

export default router;

import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {changeSet, createSet} from "../controllers/set.controller";

const router = Router();

router.patch("/changeSet/:id", authenticateToken, changeSet); // Assuming changeSet is similar to createSet
router.post('/createSet', authenticateToken, createSet);

export default router;

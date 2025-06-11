import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import {createSet} from "../controllers/set.controller";

const router = Router();

router.post('/createSet', authenticateToken, createSet);

export default router;

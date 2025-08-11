import {Router} from 'express';
import {authenticateToken} from "../middleware/auth.middleware";
import { getProgression } from '../controllers/progression.controller';

const router = Router();

router.get("/getProgression/:name", authenticateToken, getProgression);

export default router;
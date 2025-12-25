import {Router} from 'express';
import {loginUser, registerUser, isAuthenticated, logoutUser, getUserAge} from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/getUserAge', authenticateToken, getUserAge as any);
router.get('/isAuthenticated', authenticateToken, isAuthenticated);
router.post('/login', loginUser);
router.post('/register', registerUser);
router.post("/logout", authenticateToken, logoutUser);

export default router;

import {Router} from 'express';
import {loginUser, registerUser, isAuthenticated, logoutUser} from '../controllers/user.controller';

const router = Router();

router.post('/login', loginUser);
router.post('/register', registerUser);
router.post("/logout", isAuthenticated, logoutUser);

export default router;

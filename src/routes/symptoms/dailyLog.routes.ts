import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { getDailyLogs, getDailyLog, createDailyLog, updateDailyLog, deleteDailyLog } from '../../controllers/symptoms/dailyLog.controller';

const router = Router();
router.use(authenticateToken);

router.get('/', getDailyLogs as any);
router.post('/', createDailyLog as any);
router.get('/:date', getDailyLog as any);
router.put('/:id', updateDailyLog as any);
router.delete('/:id', deleteDailyLog as any);

export default router;


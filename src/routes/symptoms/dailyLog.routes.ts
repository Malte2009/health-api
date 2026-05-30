import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { getDailyLogs, getDailyLog, createDailyLog, updateDailyLog, deleteDailyLog } from '../../controllers/symptoms/dailyLog.controller';

const router = Router();
router.use(authenticateToken);

router.get('/', getDailyLogs);
router.post('/', createDailyLog);
router.get('/:date', getDailyLog);
router.put('/:id', updateDailyLog);
router.delete('/:id', deleteDailyLog);

export default router;


import { Router } from 'express';
import {
    getSleepLogs,
    getSleepLogById,
    createSleepLog,
    updateSleepLog,
    deleteSleepLog
} from '../../controllers/vitals/sleep.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// Alle Operationen benötigen eine Authentifizierung
router.use(authenticateToken);

router.get('/', getSleepLogs as any);
router.get('/:id', getSleepLogById as any);
router.post('/', createSleepLog as any);
router.put('/:id', updateSleepLog as any);
router.delete('/:id', deleteSleepLog as any);

export default router;

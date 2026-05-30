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

router.get('/', getSleepLogs);
router.get('/:id', getSleepLogById);
router.post('/', createSleepLog);
router.put('/:id', updateSleepLog);
router.delete('/:id', deleteSleepLog);

export default router;

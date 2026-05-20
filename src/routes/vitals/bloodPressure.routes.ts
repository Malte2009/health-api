import { Router } from 'express';
import {
    getBloodPressureLogs,
    getBloodPressureLogById,
    createBloodPressureLog,
    updateBloodPressureLog,
    deleteBloodPressureLog
} from '../../controllers/vitals/bloodPressure.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// Alle Operationen benötigen eine Authentifizierung
router.use(authenticateToken);

router.get('/', getBloodPressureLogs as any);
router.get('/:id', getBloodPressureLogById as any);
router.post('/', createBloodPressureLog as any);
router.put('/:id', updateBloodPressureLog as any);
router.delete('/:id', deleteBloodPressureLog as any);

export default router;

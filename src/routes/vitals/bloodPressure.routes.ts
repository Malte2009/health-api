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

router.get('/', getBloodPressureLogs);
router.get('/:id', getBloodPressureLogById);
router.post('/', createBloodPressureLog);
router.put('/:id', updateBloodPressureLog);
router.delete('/:id', deleteBloodPressureLog);

export default router;

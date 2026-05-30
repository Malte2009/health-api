import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { getSyncopes, getSyncope, createSyncope, updateSyncope, deleteSyncope } from '../../controllers/symptoms/syncope.controller';

const router = Router();
router.use(authenticateToken);

router.get('/', getSyncopes);
router.post('/', createSyncope);
router.get('/:id', getSyncope);
router.put('/:id', updateSyncope);
router.delete('/:id', deleteSyncope);

export default router;


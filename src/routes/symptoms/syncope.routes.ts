import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { getSyncopes, getSyncope, createSyncope, updateSyncope, deleteSyncope } from '../../controllers/symptoms/syncope.controller';

const router = Router();
router.use(authenticateToken);

router.get('/', getSyncopes as any);
router.post('/', createSyncope as any);
router.get('/:id', getSyncope as any);
router.put('/:id', updateSyncope as any);
router.delete('/:id', deleteSyncope as any);

export default router;


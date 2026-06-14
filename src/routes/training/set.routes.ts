import {Router} from 'express';
import {authenticateToken} from "../../middleware/auth.middleware";
import {getSetTypes, changeSet, createSet, deleteSet, getSetById, getSetUnits} from "../../controllers/training/set.controller";

const router = Router();


router.get("/:id", authenticateToken, getSetById);
router.get("/types", authenticateToken, getSetTypes);
router.get("/units", authenticateToken, getSetUnits);
router.patch("/:id", authenticateToken, changeSet);
router.post('/', authenticateToken, createSet);
router.delete("/:id", authenticateToken, deleteSet);

export default router;

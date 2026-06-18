import {Router} from 'express';
import {authenticateToken} from "../../middleware/auth.middleware";
import SetController from "../../controllers/training/set.controller";

const router = Router({ mergeParams: true });

router.use(authenticateToken);

router.get("/types", SetController.getSetTypes);
router.get("/units", SetController.getSetUnits);
router.get("/", SetController.getSets);
router.post('/', SetController.createSet);
router.get("/:setId", SetController.getSetById);
router.patch("/:setId", SetController.changeSet);
router.delete("/:setId", SetController.deleteSet);

export default router;

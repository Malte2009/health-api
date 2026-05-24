import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { getSymptoms, getSymptom, createSymptom, updateSymptom, deleteSymptom, uploadSymptomPicture, deleteSymptomPicture } from '../../controllers/symptoms/symptom.controller';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'public/images/');
  },
  filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({ storage: storage });

const router = Router();
router.use(authenticateToken);

router.get('/', getSymptoms as any);
router.post('/', createSymptom as any);
router.get('/:id', getSymptom as any);
router.patch('/:id', updateSymptom as any);
router.delete('/:id', deleteSymptom as any);

router.post('/:id/pictures', upload.single('picture'), uploadSymptomPicture as any);
router.delete('/:id/pictures/:pictureId', deleteSymptomPicture as any);

export default router;

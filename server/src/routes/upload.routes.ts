import { Router } from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/upload.controller';
import { requireAuth } from '../middleware/auth';
import { requireCouple } from '../middleware/couple';

const router = Router();

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Please upload JPEG, PNG, WebP, or GIF'));
    }
  },
});

router.use(requireAuth, requireCouple);

router.post('/', upload.single('image'), UploadController.uploadImage);
router.delete('/:id', UploadController.deleteImage);

export const uploadRoutes = router;

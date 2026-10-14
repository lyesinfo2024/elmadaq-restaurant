import { Router } from 'express';
import {
  uploadMiddleware,
  handleProductImageUpload,
  handleMulterErrors,
} from '../controllers/uploadController.ts';
import { authenticate, requireRole } from '../middleware/authMiddleware.ts';

const router = Router();

// POST /api/upload/product-image
// Protected: Only ADMIN or MANAGER can upload meal images
router.post(
  '/product-image',
  authenticate,
  requireRole('ADMIN', 'MANAGER'),
  uploadMiddleware,
  handleMulterErrors,
  handleProductImageUpload
);

export default router;

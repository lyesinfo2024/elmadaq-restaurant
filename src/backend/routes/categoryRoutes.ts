import { Router } from 'express';
import { getCategories, getCategoryById, createCategory } from '../controllers/categoryController.ts';
import { authenticate, requireRole } from '../middleware/authMiddleware.ts';

const router = Router();

// GET /api/categories - جلب جميع التصنيفات
router.get('/', getCategories);

// GET /api/categories/:id - جلب تصنيف محدد
router.get('/:id', getCategoryById);

// POST /api/categories - إنشاء تصنيف جديد (ADMIN / MANAGER)
router.post('/', authenticate, requireRole('ADMIN', 'MANAGER'), createCategory);

export default router;


import { Router } from 'express';
import { getCategories, getCategoryById, createCategory, deleteCategory } from '../controllers/categoryController.ts';
import { authenticate, requireRole } from '../middleware/authMiddleware.ts';

const router = Router();

// GET /api/categories - جلب جميع التصنيفات
router.get('/', getCategories);

// GET /api/categories/:id - جلب تصنيف محدد
router.get('/:id', getCategoryById);

// POST /api/categories - إنشاء تصنيف جديد (ADMIN / MANAGER)
router.post('/', authenticate, requireRole('ADMIN', 'MANAGER'), createCategory);

// DELETE /api/categories/:id - حذف تصنيف (ADMIN / MANAGER)
router.delete('/:id', authenticate, requireRole('ADMIN', 'MANAGER'), deleteCategory);

export default router;


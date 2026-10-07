import { Router } from 'express';
import { getCategories, getCategoryById } from '../controllers/categoryController.ts';

const router = Router();

// GET /api/categories - جلب جميع التصنيفات
router.get('/', getCategories);

// GET /api/categories/:id - جلب تصنيف محدد
router.get('/:id', getCategoryById);

export default router;

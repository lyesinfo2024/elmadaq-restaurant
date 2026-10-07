import { Router } from 'express';
import { getProducts, getProductById, updateProduct } from '../controllers/productController.ts';
import { authenticate, requireRole } from '../middleware/authMiddleware.ts';

const router = Router();

// GET /api/products - جلب قائمة الوجبات
router.get('/', getProducts);

// GET /api/products/:id - جلب تفاصيل وجبة محددة
router.get('/:id', getProductById);

// PUT /api/products/:id - تحديث الوجبة أو توفرها (للإدارة ADMIN / MANAGER)
router.put('/:id', authenticate, requireRole('ADMIN', 'MANAGER'), updateProduct);

export default router;

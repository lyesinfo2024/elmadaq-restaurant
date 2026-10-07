import { Router } from 'express';
import { createOrder, getOrderById, getOrderByNumber } from '../controllers/orderController.ts';

const router = Router();

// POST /api/orders - إنشاء طلب حقيقي
router.post('/', createOrder);

// GET /api/orders/track/:orderNumber - تتبع حالة الطلب برقم الطلب السهل (مثل: #1001)
router.get('/track/:orderNumber', getOrderByNumber);

// GET /api/orders/:id - جلب تفاصيل الطلب بالمعرف
router.get('/:id', getOrderById);

export default router;

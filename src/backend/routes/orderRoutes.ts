import { Router } from 'express';
import {
  createOrder,
  getOrderById,
  getOrderByNumber,
  printOrderReceipt,
  streamOrderEvents,
} from '../controllers/orderController.ts';

const router = Router();

// GET /api/orders/events/stream - بث الأحداث الفوري عبر SSE
router.get('/events/stream', streamOrderEvents);

// POST /api/orders - إنشاء طلب حقيقي
router.post('/', createOrder);

// GET /api/orders/track/:orderNumber - تتبع حالة الطلب برقم الطلب السهل (مثل: #1001)
router.get('/track/:orderNumber', getOrderByNumber);

// GET /api/orders/:id/print - صفحة طباعة حرارية مخصصة لطابعات Xprinter
router.get('/:id/print', printOrderReceipt);

// GET /api/orders/:id - جلب تفاصيل الطلب بالمعرف
router.get('/:id', getOrderById);

export default router;


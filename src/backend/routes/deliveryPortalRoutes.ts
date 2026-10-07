import { Router } from 'express';
import {
  getMyProfile,
  getMyAssignedOrders,
  getMySingleOrder,
  updateMyOrderStatus,
  toggleMyAvailability,
  getMyCourierDues,
} from '../controllers/deliveryPortalController.ts';
import { authenticate, requireRole } from '../middleware/authMiddleware.ts';

const router = Router();

// مسارات بوابة عامل التوصيل محمية لعامل التوصيل أو الإدارة
router.use(authenticate);
router.use(requireRole('DELIVERY', 'ADMIN', 'MANAGER'));

// GET /api/delivery/profile - الملف الشخصي وإحصائيات اليوم
router.get('/profile', getMyProfile);

// GET /api/delivery/dues - جلب مستحقات ومداخيل المندوب
router.get('/dues', getMyCourierDues);

// GET /api/delivery/orders - الطلبات المسندة للعامل الحالي
router.get('/orders', getMyAssignedOrders);

// GET /api/delivery/orders/:id - جلب تفاصيل طلب مسند مع التحقق الأمني
router.get('/orders/:id', getMySingleOrder);

// PUT /api/delivery/orders/:id/status - تحديث حالة الطلب
router.put('/orders/:id/status', updateMyOrderStatus);

// PATCH /api/delivery/availability - تغيير حالة التوفر
router.patch('/availability', toggleMyAvailability);

export default router;

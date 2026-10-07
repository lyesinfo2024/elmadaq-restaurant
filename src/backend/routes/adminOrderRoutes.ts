import { Router } from 'express';
import { getAdminOrders, updateOrderStatus } from '../controllers/orderController.ts';
import { assignOrderToStaff } from '../controllers/deliveryStaffController.ts';
import { authenticate, requireRole } from '../middleware/authMiddleware.ts';

const router = Router();

// مسارات إدارة الطلبات محمية بصلاحية ADMIN و MANAGER فقط
router.use(authenticate);
router.use(requireRole('ADMIN', 'MANAGER'));

// GET /api/admin/orders - استعراض كافة الطلبات
router.get('/', getAdminOrders);

// PUT /api/admin/orders/:id/status - تغيير حالة الطلب
router.put('/:id/status', updateOrderStatus);

// PUT /api/admin/orders/:id/assign - إسناد أو تغيير عامل التوصيل للطلب
router.put('/:id/assign', assignOrderToStaff);

export default router;

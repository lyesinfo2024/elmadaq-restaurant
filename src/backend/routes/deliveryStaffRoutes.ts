import { Router } from 'express';
import {
  getAllDeliveryStaff,
  getDeliveryStaffById,
  createDeliveryStaff,
  updateDeliveryStaff,
  toggleDeliveryStaffStatus,
  getCourierDuesSummary,
  recordCourierPayout,
} from '../controllers/deliveryStaffController.ts';
import { authenticate, requireRole } from '../middleware/authMiddleware.ts';

const router = Router();

// حماية مسارات إدارة عمال التوصيل بصلاحية ADMIN و MANAGER
router.use(authenticate);
router.use(requireRole('ADMIN', 'MANAGER'));

// GET /api/admin/delivery-staff/dues/summary - تقرير ملخص مستحقات التوصيل
router.get('/dues/summary', getCourierDuesSummary);

// GET /api/admin/delivery-staff - قائمة عمال التوصيل
router.get('/', getAllDeliveryStaff);

// GET /api/admin/delivery-staff/:id - تفاصيل عامل توصيل
router.get('/:id', getDeliveryStaffById);

// POST /api/admin/delivery-staff - إضافة عامل توصيل جديد
router.post('/', createDeliveryStaff);

// PUT /api/admin/delivery-staff/:id - تعديل بيانات عامل التوصيل
router.put('/:id', updateDeliveryStaff);

// PATCH /api/admin/delivery-staff/:id/toggle-status - تفعيل أو تعطيل حساب العامل
router.patch('/:id/toggle-status', toggleDeliveryStaffStatus);

// POST /api/admin/delivery-staff/:id/payout - تسجيل دفع وتسوية مستحقات لمندوب
router.post('/:id/payout', recordCourierPayout);

export default router;

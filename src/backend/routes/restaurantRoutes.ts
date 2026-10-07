import { Router } from 'express';
import { getRestaurantInfo, updateRestaurantInfo } from '../controllers/restaurantController.ts';
import { authenticate, requireRole } from '../middleware/authMiddleware.ts';
import { validateRestaurantUpdate } from '../middleware/validationMiddleware.ts';

const router = Router();

// GET /api/restaurant - جلب إعدادات وهوية المطعم للجميع
router.get('/', getRestaurantInfo);

// PUT /api/restaurant - تحديث إعدادات وهوية المطعم (للإدارة ADMIN فقط)
router.put('/', authenticate, requireRole('ADMIN'), validateRestaurantUpdate, updateRestaurantInfo);

export default router;

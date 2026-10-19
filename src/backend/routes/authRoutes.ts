import { Router } from 'express';
import { login, getCurrentUser, changePassword } from '../controllers/authController.ts';
import { validateLogin } from '../middleware/validationMiddleware.ts';
import { authenticate } from '../middleware/authMiddleware.ts';

const router = Router();

// POST /api/auth/login - تسجيل الدخول والحصول على JWT
router.post('/login', validateLogin, login);

// GET /api/auth/me - جلب بيانات المستخدم المسجل حالياً
router.get('/me', authenticate, getCurrentUser);

// POST & PUT /api/auth/change-password - تغيير كلمة المرور للمستخدم المسجل حالياً (مدير أو توصيل)
router.post('/change-password', authenticate, changePassword);
router.put('/change-password', authenticate, changePassword);
router.put('/password', authenticate, changePassword);

export default router;


import { Router } from 'express';
import { login, getCurrentUser } from '../controllers/authController.ts';
import { validateLogin } from '../middleware/validationMiddleware.ts';
import { authenticate } from '../middleware/authMiddleware.ts';

const router = Router();

// POST /api/auth/login - تسجيل الدخول والحصول على JWT
router.post('/login', validateLogin, login);

// GET /api/auth/me - جلب بيانات المستخدم المسجل حالياً
router.get('/me', authenticate, getCurrentUser);

export default router;

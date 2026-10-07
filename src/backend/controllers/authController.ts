import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { dbStore } from '../db/index.ts';
import { generateToken, AuthenticatedRequest } from '../middleware/authMiddleware.ts';

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const user = dbStore.getUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'هذا الحساب معطل حالياً، يرجى التواصل مع الإدارة',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      });
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
    };

    const token = generateToken(tokenPayload);
    const safeUser = dbStore.toSafeUser(user);

    return res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        token,
        user: safeUser,
      },
    });
  } catch (error) {
    console.error('login error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في عملية تسجيل الدخول',
    });
  }
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح',
      });
    }

    const user = dbStore.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود',
      });
    }

    return res.json({
      success: true,
      data: dbStore.toSafeUser(user),
    });
  } catch (error) {
    console.error('getCurrentUser error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب بيانات المستخدم',
    });
  }
}

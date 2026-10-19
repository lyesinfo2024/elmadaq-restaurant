import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { dbStore } from '../db/index.ts';
import { generateToken, AuthenticatedRequest } from '../middleware/authMiddleware.ts';

export async function login(req: Request, res: Response) {
  try {
    const { email, username, identifier, password } = req.body;
    const loginId = (identifier || email || username || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        error: 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور',
      });
    }

    const user = dbStore.getUserByEmailOrUsername(loginId);

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

export async function changePassword(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح: يجب تسجيل الدخول لتغيير كلمة المرور',
      });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    // 1. Check current password input
    if (!currentPassword || typeof currentPassword !== 'string' || !currentPassword.trim()) {
      return res.status(400).json({
        success: false,
        error: 'يرجى إدخال كلمة المرور الحالية',
      });
    }

    // 2. Check new password input
    if (!newPassword || typeof newPassword !== 'string' || !newPassword.trim()) {
      return res.status(400).json({
        success: false,
        error: 'يرجى إدخال كلمة المرور الجديدة',
      });
    }

    // 3. Minimum 10 characters requirement
    if (newPassword.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'كلمة المرور الجديدة يجب ألا تقل عن 10 أحرف',
      });
    }

    // 4. Check confirm password input
    if (!confirmPassword || typeof confirmPassword !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'يرجى تأكيد كلمة المرور الجديدة',
      });
    }

    // 5. Ensure match between new and confirm
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقين',
      });
    }

    // 6. Retrieve authenticated user strictly by their JWT user ID
    // Each user only alters their own password
    const user = dbStore.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'هذا الحساب معطل حالياً',
      });
    }

    // 7. Verify current password matches bcrypt hash in database
    const isCurrentMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentMatch) {
      return res.status(400).json({
        success: false,
        error: 'كلمة المرور الحالية غير صحيحة',
      });
    }

    // 8. Disallow reusing exact same password
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        error: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية',
      });
    }

    // 9. Hash new password with bcrypt (salt rounds = 10)
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // 10. Update password in SQLite
    const updated = dbStore.updateUserPassword(user.id, newPasswordHash);
    if (!updated) {
      return res.status(500).json({
        success: false,
        error: 'فشل في حفظ كلمة المرور الجديدة في قاعدة البيانات',
      });
    }

    return res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح',
    });
  } catch (error) {
    console.error('changePassword error occurred');
    return res.status(500).json({
      success: false,
      error: 'حدث خطأ في الخادم أثناء معالجة طلب تغيير كلمة المرور',
    });
  }
}


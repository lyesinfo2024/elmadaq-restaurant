import { Request, Response, NextFunction } from 'express';

/**
 * التحقق من صيغة أرقام الهاتف في الجزائر:
 * يدعم شبكات: موبيليس (06)، جازي (07)، أوريدو (05)، والهاتف الثابت (02x/03x/04x)
 * الصيغ المقبولة: 05XXXXXXXX / 06XXXXXXXX / 07XXXXXXXX أو مع الرمز الدولي +213 / 00213
 */
export function isValidAlgerianPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-\.]/g, '');
  // Matches 05/06/07 followed by 8 digits, or +213 / 00213 prefix
  const mobileRegex = /^(?:(?:\+|00)213|0)[567]\d{8}$/;
  const landlineRegex = /^(?:(?:\+|00)213|0)[234]\d{7,8}$/;
  return mobileRegex.test(cleaned) || landlineRegex.test(cleaned);
}

export function validateLogin(req: Request, res: Response, next: NextFunction) {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      error: 'يرجى إدخال بريد إلكتروني صحيح',
    });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'كلمة المرور يجب أن لا تقل عن 6 أحرف',
    });
  }

  next();
}

export function validateRestaurantUpdate(req: Request, res: Response, next: NextFunction) {
  const { name, phone, address, defaultDeliveryFee, minOrderAmount } = req.body;

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    return res.status(400).json({
      success: false,
      error: 'اسم المطعم لا يمكن أن يكون فارغاً',
    });
  }

  if (phone !== undefined) {
    if (typeof phone !== 'string' || phone.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'رقم هاتف المطعم لا يمكن أن يكون فارغاً',
      });
    }
    if (!isValidAlgerianPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: 'يرجى إدخال رقم هاتف جزائري صحيح (مثال: 0550123456 أو 0661234567 أو 0770123456)',
      });
    }
  }

  if (address !== undefined && (typeof address !== 'string' || address.trim().length === 0)) {
    return res.status(400).json({
      success: false,
      error: 'عنوان المطعم لا يمكن أن يكون فارغاً',
    });
  }

  if (defaultDeliveryFee !== undefined && (typeof defaultDeliveryFee !== 'number' || defaultDeliveryFee < 0)) {
    return res.status(400).json({
      success: false,
      error: 'سعر التوصيل يجب أن يكون رقماً صحيحاً بالدينار الجزائري',
    });
  }

  if (minOrderAmount !== undefined && (typeof minOrderAmount !== 'number' || minOrderAmount < 0)) {
    return res.status(400).json({
      success: false,
      error: 'الحد الأدنى للطلب يجب أن يكون رقماً صحيحاً بالدينار الجزائري',
    });
  }

  next();
}

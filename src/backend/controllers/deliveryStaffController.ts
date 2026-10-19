import { Request, Response } from 'express';
import { dbStore } from '../db/index.ts';
import { FinancePeriod } from '../types/index.ts';

// GET /api/admin/delivery-staff - جلب قائمة عمال التوصيل مع الإحصائيات
export async function getAllDeliveryStaff(_req: Request, res: Response) {
  try {
    const staff = dbStore.getAllDeliveryPeople();
    return res.json({
      success: true,
      count: staff.length,
      data: staff,
    });
  } catch (error) {
    console.error('getAllDeliveryStaff error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب قائمة عمال التوصيل',
    });
  }
}

// GET /api/admin/delivery-staff/:id - تفاصيل عامل توصيل محدد
export async function getDeliveryStaffById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const staff = dbStore.getDeliveryPersonById(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'عامل التوصيل غير موجود',
      });
    }
    return res.json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error('getDeliveryStaffById error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في استرجاع بيانات عامل التوصيل',
    });
  }
}

// POST /api/admin/delivery-staff - إنشاء مندوب توصيل جديد
export async function createDeliveryStaff(req: Request, res: Response) {
  try {
    const { name, email, username, password, phone, vehicleType, vehiclePlateNumber, deliveryFeePerOrder } = req.body;
    const loginIdentifier = (email || username || '').trim();

    if (!name || !loginIdentifier || !password || !phone) {
      return res.status(400).json({
        success: false,
        error: 'يرجى ملء جميع البيانات المطلوبة: اسم المندوب، اسم المستخدم أو البريد الإلكتروني، كلمة المرور، ورقم الهاتف الجزائري',
      });
    }

    const newStaff = await dbStore.createDeliveryPerson({
      name,
      email: loginIdentifier,
      username: (username || loginIdentifier).trim(),
      password,
      phone,
      vehicleType: vehicleType?.trim() || 'توصيل',
      vehiclePlateNumber: vehiclePlateNumber?.trim() || undefined,
      deliveryFeePerOrder,
    });

    return res.status(201).json({
      success: true,
      message: 'تم إضافة مندوب التوصيل بنجاح',
      data: newStaff,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'فشل في إضافة مندوب التوصيل';
    return res.status(400).json({
      success: false,
      error: message,
    });
  }
}

// PUT /api/admin/delivery-staff/:id - تحديث بيانات عامل التوصيل
export async function updateDeliveryStaff(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updated = dbStore.updateDeliveryPerson(id, req.body);
    return res.json({
      success: true,
      message: 'تم تحديث بيانات عامل التوصيل بنجاح',
      data: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'فشل في تحديث بيانات عامل التوصيل';
    return res.status(400).json({
      success: false,
      error: message,
    });
  }
}

// PATCH /api/admin/delivery-staff/:id/toggle-status - تفعيل أو تعطيل عامل التوصيل
export async function toggleDeliveryStaffStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updated = dbStore.toggleDeliveryPersonStatus(id);
    return res.json({
      success: true,
      message: updated.isActive ? 'تم تفعيل حساب عامل التوصيل بنجاح' : 'تم تعطيل حساب عامل التوصيل',
      data: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'فشل في تغيير حالة عامل التوصيل';
    return res.status(400).json({
      success: false,
      error: message,
    });
  }
}

// DELETE /api/admin/delivery-staff/:id - حذف وتعطيل حساب مسؤول التوصيل
export async function deleteDeliveryStaff(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deleted = dbStore.deleteDeliveryPerson(id);
    return res.json({
      success: true,
      message: 'تم حذف وتعطيل حساب مسؤول التوصيل بنجاح',
      data: deleted,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'فشل في حذف مسؤول التوصيل';
    return res.status(400).json({
      success: false,
      error: message,
    });
  }
}

// PUT /api/admin/orders/:id/assign - إسناد طلب لعامل توصيل أو إلغاء الإسناد
export async function assignOrderToStaff(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { deliveryPersonId } = req.body;

    const updatedOrder = dbStore.assignOrderToDeliveryPerson(id, deliveryPersonId || null);

    return res.json({
      success: true,
      message: deliveryPersonId
        ? `تم إسناد الطلب بنجاح إلى ${updatedOrder.deliveryPerson?.name || 'عامل التوصيل'}`
        : 'تم إلغاء إسناد الطلب',
      data: updatedOrder,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'فشل في إسناد الطلب';
    return res.status(400).json({
      success: false,
      error: message,
    });
  }
}

// GET /api/admin/delivery-staff/dues/summary - تقرير ملخص مستحقات التوصيل والمداخيل
export async function getCourierDuesSummary(req: Request, res: Response) {
  try {
    const { period, startDate, endDate } = req.query;
    const summary = dbStore.getCourierDuesSummary(
      (period as FinancePeriod) || 'today',
      startDate as string | undefined,
      endDate as string | undefined
    );
    return res.json({
      success: true,
      data: summary,
    });
  } catch (error: unknown) {
    console.error('getCourierDuesSummary error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في استخراج تقرير مستحقات التوصيل',
    });
  }
}

// POST /api/admin/delivery-staff/:id/payout - تسجيل دفع وتسوية مستحقات لمندوب توصيل
export async function recordCourierPayout(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const payout = dbStore.recordCourierPayout(id, notes);
    return res.json({
      success: true,
      message: `تم تسجيل دفع وتسوية مبلغ ${payout.amount} دج للمندوب ${payout.deliveryPersonName} بنجاح ✅`,
      data: payout,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'فشل في تسجيل الدفع للمندوب';
    return res.status(400).json({
      success: false,
      error: message,
    });
  }
}

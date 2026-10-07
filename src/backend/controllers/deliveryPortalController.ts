import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { dbStore } from '../db/index.ts';
import { OrderStatus } from '../types/index.ts';

// GET /api/delivery/profile - جلب الملف الشخصي لعامل التوصيل مع إحصائيات اليوم
export async function getMyProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'غير مصرح' });
    }

    const driver = dbStore.getDeliveryPersonByUserId(userId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على ملف عامل التوصيل الخاص بحسابك',
      });
    }

    // Calculate today's stats
    const myOrders = dbStore.getOrdersForDeliveryPerson(driver.id);
    const today = new Date().toISOString().slice(0, 10);

    const todayDeliveredOrders = myOrders.filter((o) => {
      const orderDate = (o.updatedAt || o.createdAt).slice(0, 10);
      return o.status === 'DELIVERED' && orderDate === today;
    });

    const todayCollectedCash = todayDeliveredOrders.reduce((sum, o) => sum + o.total, 0);

    const activeOrders = myOrders.filter((o) =>
      ['READY', 'OUT_FOR_DELIVERY', 'CONFIRMED'].includes(o.status)
    );

    return res.json({
      success: true,
      data: {
        driver,
        stats: {
          activeCount: activeOrders.length,
          todayDeliveredCount: todayDeliveredOrders.length,
          todayCollectedCash,
          totalAssigned: myOrders.length,
        },
      },
    });
  } catch (error) {
    console.error('getMyProfile error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في استرجاع بيانات الملف الشخصي',
    });
  }
}

// GET /api/delivery/orders - جلب الطلبات المسندة لعامل التوصيل الحالي فقط
export async function getMyAssignedOrders(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'غير مصرح' });
    }

    const driver = dbStore.getDeliveryPersonByUserId(userId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على ملف عامل التوصيل',
      });
    }

    const orders = dbStore.getOrdersForDeliveryPerson(driver.id);

    return res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error('getMyAssignedOrders error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب قائمة طلبات التوصيل',
    });
  }
}

// GET /api/delivery/orders/:id - جلب تفاصيل طلب محدد للمندوب مع منع الوصول لطلبات مندوبين آخرين
export async function getMySingleOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'غير مصرح' });
    }

    const driver = dbStore.getDeliveryPersonByUserId(userId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على ملف عامل التوصيل',
      });
    }

    const order = dbStore.getOrderById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود',
      });
    }

    if (order.deliveryPersonId !== driver.id) {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح: هذا الطلب غير مسند إليك ولا تملك صلاحية الاطلاع على بياناته',
      });
    }

    return res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('getMySingleOrder error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في استرجاع تفاصيل الطلب',
    });
  }
}

// PUT /api/delivery/orders/:id/status - تحديث حالة الطلب المسند
export async function updateMyOrderStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'غير مصرح' });
    }

    const driver = dbStore.getDeliveryPersonByUserId(userId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على ملف عامل التوصيل',
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد حالة الطلب الجديدة',
      });
    }

    const updated = dbStore.updateDeliveryOrderStatus(driver.id, id, status as OrderStatus, reason);

    let statusMessage = 'تم تحديث حالة الطلب بنجاح';
    if (status === 'OUT_FOR_DELIVERY') {
      statusMessage = 'تم تحويل الطلب إلى "في الطريق للتوصيل" 🛵';
    } else if (status === 'DELIVERED') {
      statusMessage = 'تم تأكيد التوصيل واستلام المبلغ بنجاح ✅';
    } else if (status === 'CANCELLED') {
      statusMessage = 'تم تسجيل تعذر التوصيل وإلغاء الطلب';
    }

    return res.json({
      success: true,
      message: statusMessage,
      data: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'فشل في تحديث حالة الطلب';
    const isForbidden = message.includes('غير مسند إليك') || message.includes('صلاحية');
    return res.status(isForbidden ? 403 : 400).json({
      success: false,
      error: message,
    });
  }
}

// PATCH /api/delivery/availability - تبديل حالة توفر العامل (متاح للعمل / غير متاح)
export async function toggleMyAvailability(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { isAvailable } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'غير مصرح' });
    }

    const driver = dbStore.getDeliveryPersonByUserId(userId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على ملف عامل التوصيل',
      });
    }

    const newAvailability = typeof isAvailable === 'boolean' ? isAvailable : !driver.isAvailable;
    const updated = dbStore.setDeliveryPersonAvailability(driver.id, newAvailability);

    return res.json({
      success: true,
      message: updated.isAvailable ? 'أنت الآن متاح وجاهز لاستقبال طلبات التوصيل 🛵' : 'أنت الآن غير متاح لاستقبال طلبات جديدة',
      data: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'فشل في تحديث حالة التوفر';
    return res.status(400).json({
      success: false,
      error: message,
    });
  }
}

// GET /api/delivery/dues - جلب مستحقات ومداخيل المندوب الحالي
export async function getMyCourierDues(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'غير مصرح' });
    }

    const driver = dbStore.getDeliveryPersonByUserId(userId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على ملف عامل التوصيل الخاص بحسابك',
      });
    }

    const dues = dbStore.getCourierDues(driver.id);
    return res.json({
      success: true,
      data: dues,
    });
  } catch (error) {
    console.error('getMyCourierDues error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في استخراج مستحقات عامل التوصيل',
    });
  }
}

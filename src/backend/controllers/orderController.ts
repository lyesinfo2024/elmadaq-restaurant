import { Request, Response } from 'express';
import { dbStore } from '../db/index.ts';
import { Order, OrderStatus } from '../types/index.ts';
import { verifyToken } from '../middleware/authMiddleware.ts';

// Helper to mask sensitive customer data for public visibility
function sanitizeOrderForPublic(order: Order): Order {
  const phone = order.customerPhone || '';
  const maskedPhone =
    phone.length >= 8
      ? `${phone.slice(0, 3)}****${phone.slice(-3)}`
      : '***';

  const nameParts = (order.customerName || '').trim().split(' ');
  const maskedName =
    nameParts.length > 1
      ? `${nameParts[0]} ${nameParts.slice(1).map(() => '***').join(' ')}`
      : `${nameParts[0] || 'زبون'} ***`;

  return {
    ...order,
    customerName: maskedName,
    customerPhone: maskedPhone,
    address: 'محمي للخصوصية',
    neighborhood: order.neighborhood || 'حي سكني',
    notes: undefined,
  };
}

// Helper to check user authorization
function getRequesterInfo(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  try {
    const token = authHeader.substring(7);
    return verifyToken(token);
  } catch {
    return null;
  }
}

// POST /api/orders - إنشاء طلب جديد للزبون
export async function createOrder(req: Request, res: Response) {
  try {
    const order = await dbStore.createOrder(req.body);
    return res.status(201).json({
      success: true,
      message: 'تم استلام وتأكيد طلبك بنجاح',
      data: order,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'فشل في إنشاء الطلب';
    return res.status(400).json({
      success: false,
      error: message,
    });
  }
}

// GET /api/orders/:id - جلب تفاصيل طلب محدد برقم المعرف مع احترام الخصوصية
export async function getOrderById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const order = dbStore.getOrderById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب المطلوب غير موجود',
      });
    }

    const requester = getRequesterInfo(req);

    // صاحب المطعم أو المسؤول
    if (requester && (requester.role === 'ADMIN' || requester.role === 'MANAGER')) {
      return res.json({
        success: true,
        data: order,
      });
    }

    // مندوب التوصيل
    if (requester && requester.role === 'DELIVERY') {
      const driver = dbStore.getDeliveryPersonByUserId(requester.userId);
      if (!driver || order.deliveryPersonId !== driver.id) {
        return res.status(403).json({
          success: false,
          error: 'غير مصرح: هذا الطلب غير مسند إليك ولا تملك صلاحية الاطلاع على بياناته',
        });
      }
      return res.json({
        success: true,
        data: order,
      });
    }

    // الزائر / التتبع العام - حماية بيانات الزبون
    return res.json({
      success: true,
      data: sanitizeOrderForPublic(order),
    });
  } catch (error) {
    console.error('getOrderById error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في استرجاع تفاصيل الطلب',
    });
  }
}

// GET /api/orders/track/:orderNumber - تتبع الطلب برقم الطلب السهل مع حماية خصوصية الزبون
export async function getOrderByNumber(req: Request, res: Response) {
  try {
    const { orderNumber } = req.params;
    const order = dbStore.getOrderByNumber(orderNumber);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: `الطلب رقم "${orderNumber}" غير موجود، يرجى التأكد من الرقم والمحاولة مجدداً`,
      });
    }

    const requester = getRequesterInfo(req);

    // صاحب المطعم أو المسؤول
    if (requester && (requester.role === 'ADMIN' || requester.role === 'MANAGER')) {
      return res.json({
        success: true,
        data: order,
      });
    }

    // مندوب التوصيل
    if (requester && requester.role === 'DELIVERY') {
      const driver = dbStore.getDeliveryPersonByUserId(requester.userId);
      if (!driver || order.deliveryPersonId !== driver.id) {
        return res.status(403).json({
          success: false,
          error: 'غير مصرح: هذا الطلب غير مسند إليك ولا تملك صلاحية الاطلاع على بياناته',
        });
      }
      return res.json({
        success: true,
        data: order,
      });
    }

    // الزبون / التتبع العام - إرجاع معلومات التتبع مع حجب البيانات الحساسة
    return res.json({
      success: true,
      data: sanitizeOrderForPublic(order),
    });
  } catch (error) {
    console.error('getOrderByNumber error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تتبع الطلب',
    });
  }
}

// GET /api/admin/orders - جلب جميع الطلبات للإدارة (ADMIN / MANAGER)
export async function getAdminOrders(_req: Request, res: Response) {
  try {
    const orders = dbStore.getAllOrders();
    return res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error('getAdminOrders error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب قائمة الطلبات للإدارة',
    });
  }
}

// PUT /api/admin/orders/:id/status - تحديث حالة الطلب من قِبل الإدارة
export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'يرجى تحديد حالة الطلب الجديدة',
      });
    }

    const updated = dbStore.updateOrderStatus(id, status as OrderStatus);
    return res.json({
      success: true,
      message: `تم تحديث حالة الطلب ${updated.orderNumber} إلى ${status} بنجاح`,
      data: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'فشل في تحديث حالة الطلب';
    return res.status(400).json({
      success: false,
      error: message,
    });
  }
}

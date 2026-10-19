import { Request, Response } from 'express';
import { dbStore } from '../db/index.ts';
import { Order, OrderStatus } from '../types/index.ts';
import { verifyToken } from '../middleware/authMiddleware.ts';
import { orderEventsHub } from '../services/orderEventsHub.ts';

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
    // Realtime notification for Admin & Kitchen
    orderEventsHub.notifyOrderCreated(order);
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

// GET /api/orders/events/stream - Server-Sent Events (SSE) بث فوري لأحداث الطلبات
export async function streamOrderEvents(req: Request, res: Response) {
  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  // Send initial handshake / keepalive
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'connected to orders stream', time: new Date().toISOString() })}\n\n`);
  if (typeof (res as any).flush === 'function') {
    (res as any).flush();
  }

  const onEvent = (eventData: any) => {
    try {
      const json = JSON.stringify(eventData);
      const eventName = eventData?.type || 'order:created';
      // 1. Send with explicit event name (e.g. event: order:created)
      res.write(`event: ${eventName}\ndata: ${json}\n\n`);
      // 2. Send standard message for onmessage listeners
      res.write(`data: ${json}\n\n`);
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    } catch {
      // Stream closed or error
    }
  };

  orderEventsHub.on('order_event', onEvent);

  // Periodic heartbeat every 20 seconds to keep connection open through proxies/cloud run
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    } catch {
      clearInterval(heartbeatTimer);
    }
  }, 20000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeatTimer);
    orderEventsHub.off('order_event', onEvent);
  });
}

// GET /api/orders/:id/print - صفحة طباعة حرارية مستقلة تماماً لطابعات Xprinter
export async function printOrderReceipt(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const widthParam = (req.query.width as string) || '80mm';
    const is58mm = widthParam === '58mm';
    const widthMm = is58mm ? '54mm' : '76mm';
    const baseFontSize = is58mm ? '11px' : '13px';
    const titleFontSize = is58mm ? '16px' : '20px';
    const orderNumFontSize = is58mm ? '20px' : '26px';
    const totalFontSize = is58mm ? '18px' : '24px';
    const padding = is58mm ? '3mm 1.5mm' : '5mm 2.5mm';

    let order = dbStore.getOrderById(id);
    if (!order) {
      order = dbStore.getOrderByNumber(id);
    }

    if (!order) {
      return res.status(404).send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>الطلب غير موجود</title></head><body style="font-family: sans-serif; text-align: center; padding: 40px;"><h2>الطلب رقم "${id}" غير موجود</h2><p>يرجى التأكد من رقم الطلب والمحاولة مجدداً.</p></body></html>`);
    }

    const restaurant = dbStore.getRestaurant();
    const restaurantName = restaurant?.name || 'مطعم المذاق';

    const formatDZD = (num: number) => `${Math.round(num || 0).toLocaleString('fr-DZ')} دج`;
    const formatPhone = (p: string) => {
      const c = (p || '').replace(/\D/g, '');
      return c.length === 10 && c.startsWith('0') ? `${c.slice(0, 4)} ${c.slice(4, 6)} ${c.slice(6, 8)} ${c.slice(8, 10)}` : p;
    };
    const formatDate = (dt: string) => {
      try {
        return new Intl.DateTimeFormat('ar-DZ', {
          timeZone: 'Africa/Algiers',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(dt));
      } catch {
        return dt;
      }
    };

    let itemsHtml = '';
    if (order.items && order.items.length > 0) {
      itemsHtml = `
        <div style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
        <div style="font-weight: 800; font-size: ${is58mm ? '10px' : '11px'}; display: flex; justify-content: space-between; padding-bottom: 4px; border-bottom: 1px dotted #666; margin-bottom: 6px;">
          <span>الوجبة / الصنف</span>
          <span>المبلغ</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${order.items
            .map(
              (item) => `
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; font-weight: 700;">
                <span style="text-align: right; line-height: 1.3;">${item.quantity} × ${item.productName}</span>
                <span style="font-family: monospace; font-weight: 800; white-space: nowrap; margin-right: 4px;">${formatDZD(item.totalPrice)}</span>
              </div>
              ${item.notes ? `<div style="font-size: 10px; color: #333; padding-right: 8px; font-style: italic;">* ${item.notes}</div>` : ''}
            </div>
          `
            )
            .join('')}
        </div>
        ${
          order.deliveryFee > 0
            ? `
          <div style="margin-top: 8px; padding-top: 4px; border-top: 1px dotted #666; font-size: 11px; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between;">
              <span>مجموع الوجبات:</span>
              <span style="font-family: monospace;">${formatDZD(order.subtotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>سعر التوصيل:</span>
              <span style="font-family: monospace;">${formatDZD(order.deliveryFee)}</span>
            </div>
          </div>
        `
            : ''
        }
      `;
    }

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>طباعة طلبية رقم ${order.orderNumber} - ${restaurantName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #f1f5f9;
      color: #000000 !important;
      font-family: 'Cairo', system-ui, -apple-system, sans-serif;
      width: 100% !important;
      -webkit-font-smoothing: antialiased;
    }
    .toolbar {
      background: #0f172a;
      color: #ffffff;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .btn-print {
      background: #f59e0b;
      color: #000000;
      font-weight: 900;
      font-size: 14px;
      padding: 8px 18px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-print:hover {
      background: #d97706;
    }
    .switch-width {
      display: inline-flex;
      gap: 6px;
    }
    .switch-width a {
      background: #334155;
      color: #e2e8f0;
      text-decoration: none;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 8px;
    }
    .switch-width a.active {
      background: #f59e0b;
      color: #000;
    }
    .container {
      padding: 24px 12px;
      display: flex;
      justify-content: center;
    }
    .thermal-slip {
      width: ${widthMm};
      max-width: ${widthMm};
      margin: 0 auto;
      padding: ${padding};
      background: #ffffff;
      color: #000000;
      font-size: ${baseFontSize};
      line-height: 1.35;
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
      border: 1px solid #cbd5e1;
      border-radius: 6px;
    }
    .dashed-line {
      border-bottom: 2px dashed #000000;
      margin: 8px 0;
    }
    .thin-dashed {
      border-bottom: 1px dashed #000000;
      margin: 8px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 5px;
    }
    .label {
      font-weight: 700;
      flex-shrink: 0;
    }
    .value {
      font-weight: 700;
      text-align: left;
    }
    @media print {
      body {
        background: #ffffff !important;
      }
      .toolbar {
        display: none !important;
      }
      .container {
        padding: 0 !important;
      }
      .thermal-slip {
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        width: ${widthMm} !important;
        max-width: ${widthMm} !important;
        margin: 0 auto !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-weight: 800; font-size: 15px;">قصاصة طلبية: ${order.orderNumber}</span>
      <span style="font-size: 12px; opacity: 0.8;">(${restaurantName})</span>
    </div>
    <div style="display: flex; align-items: center; gap: 12px;">
      <div class="switch-width">
        <a href="?width=80mm" class="${!is58mm ? 'active' : ''}">80 مم</a>
        <a href="?width=58mm" class="${is58mm ? 'active' : ''}">58 مم</a>
      </div>
      <button class="btn-print" onclick="window.print()">
        🖨️ طباعة الآن (Xprinter)
      </button>
    </div>
  </div>

  <div class="container">
    <div class="thermal-slip">
      <!-- 1. اسم المطعم -->
      <div style="text-align: center; padding-bottom: 4px;">
        <div style="font-size: ${titleFontSize}; font-weight: 900; line-height: 1.2;">${restaurantName}</div>
        <div style="font-size: 10px; font-weight: 700; color: #222; margin-top: 2px;">وصل طلبية زبون</div>
      </div>

      <div class="dashed-line"></div>

      <!-- 2. رقم الطلب -->
      <div style="text-align: center; padding: 2px 0;">
        <div style="font-size: 11px; font-weight: 700;">رقم الطلب</div>
        <div style="font-size: ${orderNumFontSize}; font-weight: 900; font-family: monospace; letter-spacing: 1px;">${order.orderNumber}</div>
      </div>

      <div class="dashed-line"></div>

      <!-- 3. اسم الزبون، رقم الهاتف، منطقة التوصيل، التاريخ -->
      <div style="padding: 2px 0;">
        <div class="row">
          <span class="label">اسم الزبون:</span>
          <span class="value" style="font-weight: 800;">${order.customerName || '—'}</span>
        </div>

        ${
          order.customerPhone
            ? `
        <div class="row" style="align-items: center;">
          <span class="label">رقم الهاتف:</span>
          <span class="value" dir="ltr" style="font-family: monospace; font-weight: 800;">${formatPhone(order.customerPhone)}</span>
        </div>
        `
            : ''
        }

        <div class="row">
          <span class="label">منطقة التوصيل:</span>
          <span class="value">${order.commune}${order.neighborhood ? ` (${order.neighborhood})` : ''}</span>
        </div>

        ${
          order.address
            ? `
        <div class="row" style="font-size: 11px;">
          <span class="label">العنوان:</span>
          <span class="value" style="font-weight: 500;">${order.address}</span>
        </div>
        `
            : ''
        }

        <div class="row">
          <span class="label">تاريخ الطلب:</span>
          <span class="value" style="font-size: 11px; font-weight: 700;">${formatDate(order.createdAt)}</span>
        </div>
      </div>

      <!-- تفاصيل الوجبات -->
      ${itemsHtml}

      <div class="dashed-line"></div>

      <!-- 4. المجموع النهائي بالدينار الجزائري -->
      <div style="text-align: center; padding: 4px 0;">
        <div style="font-size: 11px; font-weight: 700; margin-bottom: 2px;">المجموع النهائي المستحق</div>
        <div style="font-size: ${totalFontSize}; font-weight: 900; font-family: monospace; letter-spacing: 0.5px;">${formatDZD(order.total)}</div>
        <div style="font-size: 10px; font-weight: 700; color: #222; margin-top: 3px;">(الدفع نقداً عند الاستلام)</div>
      </div>

      ${
        order.notes
          ? `
        <div class="thin-dashed"></div>
        <div style="font-size: 11px; padding: 2px 0;">
          <span class="label">ملاحظة الزبون:</span>
          <div style="background: #f5f5f5; padding: 3px 6px; border-radius: 4px; margin-top: 2px; font-weight: 500;">${order.notes}</div>
        </div>
      `
          : ''
      }

      ${
        order.deliveryPerson
          ? `
        <div class="thin-dashed"></div>
        <div class="row" style="font-size: 11px;">
          <span class="label">عامل التوصيل:</span>
          <span class="value">${order.deliveryPerson.name} (${order.deliveryPerson.phone})</span>
        </div>
      `
          : ''
      }

      <div class="thin-dashed"></div>

      <!-- التذييل -->
      <div style="text-align: center; padding: 4px 0 2px; font-size: 10px; color: #333;">
        <div style="font-weight: 700;">شكراً لطلبكم من ${restaurantName}</div>
        <div style="margin-top: 1px;">نتمنى لكم وجبة شهية وعافية!</div>
        <div style="font-family: monospace; font-size: 9px; color: #666; margin-top: 4px;">*** ${order.orderNumber} ***</div>
      </div>
    </div>
  </div>

  <script>
    // تشغيل نافذة الطباعة تلقائياً عند فتح الصفحة في لسان مستقل
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.focus();
          window.print();
        } catch (e) {
          console.warn('Auto print error:', e);
        }
      }, 400);
    });
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    console.error('printOrderReceipt error:', error);
    return res.status(500).send('<h1>خطأ في تجهيز القصاصة للطباعة</h1>');
  }
}

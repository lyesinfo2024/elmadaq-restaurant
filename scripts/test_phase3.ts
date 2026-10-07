import express from 'express';
import apiRouter from '../src/backend/routes/index.ts';
import { dbStore } from '../src/backend/db/index.ts';
import { errorHandler } from '../src/backend/middleware/errorHandler.ts';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 بدء اختبارات المرحلة الثالثة: نظام التوصيل وإدارة المناديب');
  console.log('====================================================\n');

  // Setup express test server
  const app = express();
  app.use(express.json());
  await dbStore.init();
  app.use('/api', apiRouter);
  app.use('/api', errorHandler);

  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 3001;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const results: { id: number; name: string; passed: boolean; details?: string }[] = [];

  function record(id: number, name: string, passed: boolean, details?: string) {
    results.push({ id, name, passed, details });
    const mark = passed ? '✅ نجح' : '❌ فشل';
    console.log(`${mark} [اختبار ${id}]: ${name}`);
    if (details) console.log(`   └─ تفاصيل: ${details}`);
  }

  try {
    // Login as Admin first to perform admin tasks
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@elbahdja.dz', password: 'Admin@123456' }),
    });
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson.data?.token;

    // 1. إنشاء مندوب جديد (اسم، هاتف، بريد، كلمة مرور فقط)
    const newDriverPayload = {
      name: 'سمير بلقاسم',
      email: `driver_${Date.now()}@elbahdja.dz`,
      password: 'Driver@123456',
      phone: '0555987654',
    };

    const createDriverRes = await fetch(`${baseUrl}/admin/delivery-staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(newDriverPayload),
    });
    const createDriverJson = await createDriverRes.json();
    const createdDriver = createDriverJson.data;

    const test1Passed =
      createDriverRes.status === 201 &&
      createdDriver?.name === 'سمير بلقاسم' &&
      createdDriver?.phone === '0555987654';
    record(1, 'إنشاء مندوب جديد بمعلومات بسيطة (الاسم، الهاتف، البريد، كلمة المرور)', test1Passed, `تم إنشاء المندوب ID: ${createdDriver?.id}`);

    // 2. تسجيل دخول المندوب
    const driverLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newDriverPayload.email, password: newDriverPayload.password }),
    });
    const driverLoginJson = await driverLoginRes.json();
    const driverToken = driverLoginJson.data?.token;

    const test2Passed =
      driverLoginRes.status === 200 &&
      driverLoginJson.data?.user?.role === 'DELIVERY' &&
      !!driverToken;
    record(2, 'تسجيل دخول المندوب الجديد واستلام رمز المصادقة Token', test2Passed, `صلاحية المستخدم: ${driverLoginJson.data?.user?.role}`);

    // Create a new order to test assignment
    const newOrderRes = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'فاروق مرواني',
        customerPhone: '0661122334',
        deliveryZoneId: 'zone-01',
        wilaya: 'الجزائر العاصمة',
        commune: 'سيدي امحمد / الجزائر الوسطى',
        neighborhood: 'حي التيليملي',
        address: 'عمارة 12، الطابق 1',
        notes: 'يرجى دق الجرس مرتين',
        items: [{ productId: 'prod-dz-01', quantity: 2 }],
      }),
    });
    const newOrderJson = await newOrderRes.json();
    if (!newOrderJson.success) {
      console.error('Order creation error:', newOrderJson);
    }
    const orderToAssign = newOrderJson.data;

    // 3. إسناد الطلب إلى المندوب
    const assignRes = await fetch(`${baseUrl}/admin/orders/${orderToAssign.id}/assign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ deliveryPersonId: createdDriver.id }),
    });
    const assignJson = await assignRes.json();
    const test3Passed =
      assignRes.status === 200 &&
      assignJson.data?.deliveryPersonId === createdDriver.id &&
      assignJson.data?.deliveryPerson?.name === 'سمير بلقاسم';
    record(3, 'إسناد طلب جديد إلى المندوب من لوحة صاحب المطعم', test3Passed, `تم إسناد الطلب ${orderToAssign.orderNumber} إلى ${createdDriver.name}`);

    // 4. ظهور الطلب عند المندوب في واجهة طلباتي
    const driverOrdersRes = await fetch(`${baseUrl}/delivery/orders`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    const driverOrdersJson = await driverOrdersRes.json();
    const driverOrders = driverOrdersJson.data || [];
    const foundAssigned = driverOrders.find((o: any) => o.id === orderToAssign.id);

    const test4Passed =
      driverOrdersRes.status === 200 &&
      !!foundAssigned &&
      foundAssigned.customerName === 'فاروق مرواني';
    record(4, 'ظهور الطلب المسند في قائمة طلباتي للمندوب مع بيانات الزبون', test4Passed, `عدد طلبات المندوب: ${driverOrders.length}`);

    // 5. عدم ظهور طلبات المندوبين الآخرين
    // Log in as Karim (existing courier)
    const karimLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'delivery@elbahdja.dz', password: 'Delivery@123456' }),
    });
    const karimLoginJson = await karimLoginRes.json();
    const karimToken = karimLoginJson.data?.token;

    const karimOrdersRes = await fetch(`${baseUrl}/delivery/orders`, {
      headers: { Authorization: `Bearer ${karimToken}` },
    });
    const karimOrdersJson = await karimOrdersRes.json();
    const karimOrders = karimOrdersJson.data || [];
    const karimSeesSamirOrder = karimOrders.some((o: any) => o.id === orderToAssign.id);

    const test5Passed = !karimSeesSamirOrder;
    record(5, 'عدم ظهور طلبات المندوبين الآخرين (عزل الطلبات بين المناديب)', test5Passed, `المندوب كريم لا يرى طلبات سمير`);

    // 6. اتصال المندوب بالزبون (التحقق من صحة رقم الهاتف وقابلية الاتصال)
    const test6Passed =
      foundAssigned?.customerPhone === '0661122334' &&
      foundAssigned?.customerPhone.startsWith('06');
    record(6, 'توفر رقم هاتف الزبون لإجراء الاتصال المباشر tel:', test6Passed, `رقم الزبون: ${foundAssigned?.customerPhone}`);

    // 7. تغيير الحالة إلى OUT_FOR_DELIVERY
    const outForDeliveryRes = await fetch(`${baseUrl}/delivery/orders/${orderToAssign.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ status: 'OUT_FOR_DELIVERY' }),
    });
    const outForDeliveryJson = await outForDeliveryRes.json();
    const test7Passed =
      outForDeliveryRes.status === 200 &&
      outForDeliveryJson.data?.status === 'OUT_FOR_DELIVERY';
    record(7, 'تغيير المندوب لحالة الطلب إلى "خرجت للتوصيل 🛵" (OUT_FOR_DELIVERY)', test7Passed, `حالة الطلب الحالية: ${outForDeliveryJson.data?.status}`);

    // 8. تغيير الحالة إلى DELIVERED
    const deliveredRes = await fetch(`${baseUrl}/delivery/orders/${orderToAssign.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ status: 'DELIVERED' }),
    });
    const deliveredJson = await deliveredRes.json();
    const test8Passed =
      deliveredRes.status === 200 &&
      deliveredJson.data?.status === 'DELIVERED';
    record(8, 'تغيير المندوب لحالة الطلب إلى "تم التوصيل ✅" (DELIVERED)', test8Passed, `حالة الطلب الحالية: ${deliveredJson.data?.status}`);

    // 10. تحديث الدفع إلى PAID عند التسليم النقدي
    const test10Passed = deliveredJson.data?.paymentStatus === 'PAID';
    record(10, 'تحديث حالة الدفع تلقائياً إلى PAID عند التسليم نقداً', test10Passed, `حالة الدفع: ${deliveredJson.data?.paymentStatus}`);

    // 9. تعذر التوصيل مع كتابة السبب (إنشاء طلب آخر وإلغائه بسبب بسيط)
    const cancelOrderRes = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'طارق حساني',
        customerPhone: '0770554433',
        deliveryZoneId: 'zone-01',
        wilaya: 'الجزائر العاصمة',
        commune: 'سيدي امحمد / الجزائر الوسطى',
        neighborhood: 'المرادية',
        address: 'نهج الشهداء',
        items: [{ productId: 'prod-dz-02', quantity: 1 }],
      }),
    });
    const cancelOrderJson = await cancelOrderRes.json();
    const orderToCancel = cancelOrderJson.data;

    // إسناد الطلب للمندوب سمير
    await fetch(`${baseUrl}/admin/orders/${orderToCancel.id}/assign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ deliveryPersonId: createdDriver.id }),
    });

    // تسجيل تعذر التوصيل
    const cancelStatusRes = await fetch(`${baseUrl}/delivery/orders/${orderToCancel.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        status: 'CANCELLED',
        reason: 'الزبون لا يرد على الهاتف بعد عدة محاولات',
      }),
    });
    const cancelStatusJson = await cancelStatusRes.json();
    const test9Passed =
      cancelStatusRes.status === 200 &&
      cancelStatusJson.data?.status === 'CANCELLED' &&
      cancelStatusJson.data?.cancellationReason === 'الزبون لا يرد على الهاتف بعد عدة محاولات';
    record(9, 'تسجيل تعذر التوصيل مع كتابة السبب البسيط (CANCELLED)', test9Passed, `السبب المسجل: ${cancelStatusJson.data?.cancellationReason}`);

    // 11. منع المندوب من الوصول إلى طلب غير مسند إليه (أمن وخصوصية)
    // Karim tries to access Samir's order
    const unauthorizedAccessRes = await fetch(`${baseUrl}/delivery/orders/${orderToAssign.id}`, {
      headers: { Authorization: `Bearer ${karimToken}` },
    });
    const unauthorizedUpdateRes = await fetch(`${baseUrl}/delivery/orders/${orderToAssign.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${karimToken}`,
      },
      body: JSON.stringify({ status: 'DELIVERED' }),
    });

    const test11Passed =
      unauthorizedAccessRes.status === 403 &&
      unauthorizedUpdateRes.status === 403;
    record(11, 'منع المندوب من الاطلاع على أو تعديل طلب غير مسند إليه (إرجاع 403 Forbidden)', test11Passed, `كود الاستجابة عند المحاولة: ${unauthorizedAccessRes.status} و ${unauthorizedUpdateRes.status}`);

    // 12. التأكد من أن المرحلتين الأولى والثانية ما زالتا تعملان
    const productsRes = await fetch(`${baseUrl}/products`);
    const productsJson = await productsRes.json();
    const categoriesRes = await fetch(`${baseUrl}/categories`);
    const categoriesJson = await categoriesRes.json();
    const encodedOrderNum = encodeURIComponent(orderToAssign.orderNumber);
    const trackPublicRes = await fetch(`${baseUrl}/orders/track/${encodedOrderNum}`);
    const trackPublicJson = await trackPublicRes.json();

    const test12Passed =
      productsRes.status === 200 &&
      productsJson.data?.length > 0 &&
      categoriesRes.status === 200 &&
      categoriesJson.data?.length > 0 &&
      trackPublicRes.status === 200 &&
      trackPublicJson.data?.orderNumber === orderToAssign.orderNumber &&
      trackPublicJson.data?.address === 'محمي للخصوصية'; // Privacy verified!

    record(12, 'التأكد من عمل وظائف المرحلتين الأولى والثانية وحماية خصوصية بيانات الزبون', test12Passed, `الوجبات: ${productsJson.data?.length}، التصنيفات: ${categoriesJson.data?.length}`);

  } catch (err) {
    console.error('❌ حدث خطأ أثناء تشغيل الاختبارات:', err);
  } finally {
    server.close();
  }

  console.log('\n====================================================');
  const allPassed = results.every((r) => r.passed) && results.length === 12;
  console.log(`📊 النتيجة النهائية: ${results.filter((r) => r.passed).length} من أصل ${results.length} اختبارات ناجحة`);
  if (allPassed) {
    console.log('🎉 جميع الوظائف المطلوبة في المرحلة الثالثة تعمل بنجاح 100%!');
  } else {
    console.log('⚠️ هناك اختبارات بحاجة إلى تدقيق');
  }
  console.log('====================================================\n');
}

runTests();

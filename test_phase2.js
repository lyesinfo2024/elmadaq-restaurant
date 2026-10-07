/**
 * برنامج فحص واختبار متكامل للمرحلة الثانية
 * يغطي كافة الاختبارات المطلوبة من 1 إلى 13 بدقة عبر HTTP Endpoints
 */

const BASE_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('====================================================');
  console.log('بدء تشغيل حزمة اختبارات المرحلة الثانية (13 اختبار)');
  console.log('====================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [نجح]: ${message}`);
      passedTests++;
    } else {
      console.error(`❌ [فشل]: ${message}`);
      failedTests++;
    }
  }

  try {
    // 0. تسجيل دخول المدير للحصول على الرمز لاختبارات الإدارة
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@elbahdja.dz', password: 'Admin@123456' }),
    });
    const adminToken = (await adminLoginRes.json()).data.token;

    // جلب وجبة ومنطقة توصيل صالحة
    const zonesRes = await fetch(`${BASE_URL}/delivery-zones`);
    const zones = (await zonesRes.json()).data;
    const testZone = zones[0]; // سيدي امحمد / الجزائر الوسطى (200 دج)

    const prodsRes = await fetch(`${BASE_URL}/products`);
    const prods = (await prodsRes.json()).data;
    const prod1 = prods[0]; // 450 دج
    const prod2 = prods[1]; // 750 دج

    // ----------------------------------------------------
    // اختبار 1: طلب وجبة واحدة
    // ----------------------------------------------------
    const order1Res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'محمد أمين الجزائري',
        customerPhone: '0550123456',
        wilaya: 'الجزائر العاصمة',
        commune: testZone.commune,
        neighborhood: 'حي أول ماي',
        address: 'شارع حسيبة بن بوعلي، عمارة 5',
        deliveryZoneId: testZone.id,
        items: [{ productId: prod1.id, quantity: 2 }],
      }),
    });
    const order1Data = await order1Res.json();
    assert(
      order1Res.status === 201 && order1Data.success && order1Data.data.items.length === 1,
      `اختبار 1: إنشاء طلب وجبة واحدة بنجاح برقم ${order1Data.data?.orderNumber}`
    );

    // ----------------------------------------------------
    // اختبار 2: طلب عدة وجبات
    // ----------------------------------------------------
    const order2Res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'سمير بلقاسم',
        customerPhone: '0661234567',
        wilaya: 'الجزائر العاصمة',
        commune: testZone.commune,
        neighborhood: 'حي ديار المحصول',
        address: 'نهج الشهداء، رقم 18',
        deliveryZoneId: testZone.id,
        items: [
          { productId: prod1.id, quantity: 1 },
          { productId: prod2.id, quantity: 1 },
        ],
      }),
    });
    const order2Data = await order2Res.json();
    assert(
      order2Res.status === 201 && order2Data.data.items.length === 2,
      `اختبار 2: إنشاء طلب عدة وجبات مختلفة بنجاح برقم ${order2Data.data?.orderNumber}`
    );

    // ----------------------------------------------------
    // اختبار 3: تغيير الكمية وحسابها
    // ----------------------------------------------------
    const order3Res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'ياسين قادري',
        customerPhone: '0770345678',
        wilaya: 'الجزائر العاصمة',
        commune: testZone.commune,
        neighborhood: 'حي بلكور',
        address: 'شارع محمد بلوزداد، عمارة 10',
        deliveryZoneId: testZone.id,
        items: [{ productId: prod1.id, quantity: 3 }], // 450 * 3 = 1350 دج
      }),
    });
    const order3Data = await order3Res.json();
    assert(
      order3Res.status === 201 &&
        order3Data.data.items[0].quantity === 3 &&
        order3Data.data.items[0].totalPrice === prod1.price * 3,
      `اختبار 3: تغيير الكمية (3 قطع) وحساب سعرها بدقة (${order3Data.data?.items[0].totalPrice} دج)`
    );

    // ----------------------------------------------------
    // اختبار 4: اختيار منطقة توصيل مختلفة
    // ----------------------------------------------------
    const zone2 = zones.find((z) => z.commune.includes('القبة')) || zones[1];
    const order4Res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'نبيل طاهري',
        customerPhone: '0555678901',
        wilaya: 'الجزائر العاصمة',
        commune: zone2.commune,
        neighborhood: 'حي قاريدي',
        address: 'حي قاريدي 1، عمارة 15',
        deliveryZoneId: zone2.id,
        items: [{ productId: prod2.id, quantity: 2 }],
      }),
    });
    const order4Data = await order4Res.json();
    assert(
      order4Res.status === 201 && order4Data.data.deliveryFee === zone2.deliveryFee,
      `اختبار 4: اختيار منطقة توصيل (${zone2.commune}) وتطبيق سعرها (${zone2.deliveryFee} دج) من قاعدة البيانات`
    );

    // ----------------------------------------------------
    // اختبار 5: دقة الحساب subtotal + deliveryFee = total
    // ----------------------------------------------------
    const subtotal = order4Data.data.subtotal;
    const deliveryFee = order4Data.data.deliveryFee;
    const total = order4Data.data.total;
    assert(
      total === subtotal + deliveryFee,
      `اختبار 5: التحقق الحسابي الدقيق (مجموع الوجبات: ${subtotal} دج + التوصيل: ${deliveryFee} دج = ${total} دج)`
    );

    // ----------------------------------------------------
    // اختبار 6: رقم هاتف غير صحيح (يجب رفض الطلب)
    // ----------------------------------------------------
    const invalidPhoneRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'فحص الهاتف',
        customerPhone: '123456', // رقم غير صحيح
        wilaya: 'الجزائر العاصمة',
        commune: testZone.commune,
        neighborhood: 'حي التيليملي',
        address: 'شارع 1',
        deliveryZoneId: testZone.id,
        items: [{ productId: prod1.id, quantity: 2 }],
      }),
    });
    const invalidPhoneData = await invalidPhoneRes.json();
    assert(
      invalidPhoneRes.status === 400 && !invalidPhoneData.success && invalidPhoneData.error.includes('هاتف جزائري'),
      `اختبار 6: رفض رقم هاتف جزائري غير صالح بنجاح مع رسالة: "${invalidPhoneData.error}"`
    );

    // ----------------------------------------------------
    // اختبار 7: سلة فارغة (يجب رفض الطلب)
    // ----------------------------------------------------
    const emptyCartRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'فحص السلة',
        customerPhone: '0550123456',
        wilaya: 'الجزائر العاصمة',
        commune: testZone.commune,
        neighborhood: 'حي التيليملي',
        address: 'شارع 1',
        deliveryZoneId: testZone.id,
        items: [], // سلة فارغة
      }),
    });
    const emptyCartData = await emptyCartRes.json();
    assert(
      emptyCartRes.status === 400 && !emptyCartData.success && emptyCartData.error.includes('فارغة'),
      `اختبار 7: رفض طلب بسلة فارغة بنجاح مع رسالة: "${emptyCartData.error}"`
    );

    // ----------------------------------------------------
    // اختبار 8: Product غير موجود (يجب رفض الطلب)
    // ----------------------------------------------------
    const fakeProductRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'فحص المنتج الوهمي',
        customerPhone: '0550123456',
        wilaya: 'الجزائر العاصمة',
        commune: testZone.commune,
        neighborhood: 'حي التيليملي',
        address: 'شارع 1',
        deliveryZoneId: testZone.id,
        items: [{ productId: 'prod-fake-999', quantity: 1 }],
      }),
    });
    const fakeProductData = await fakeProductRes.json();
    assert(
      fakeProductRes.status === 400 && !fakeProductData.success && fakeProductData.error.includes('غير موجودة'),
      `اختبار 8: رفض طلب يحتوي على منتج غير موجود بنجاح: "${fakeProductData.error}"`
    );

    // ----------------------------------------------------
    // اختبار 9: Product غير متاح (يجب رفض الطلب)
    // ----------------------------------------------------
    // تعطيل المنتج عبر API الإدارة المعتمد
    await fetch(`${BASE_URL}/products/${prod1.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isAvailable: false }),
    });

    const unavailableProductRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'فحص التوفر',
        customerPhone: '0550123456',
        wilaya: 'الجزائر العاصمة',
        commune: testZone.commune,
        neighborhood: 'حي التيليملي',
        address: 'شارع 1',
        deliveryZoneId: testZone.id,
        items: [{ productId: prod1.id, quantity: 2 }],
      }),
    });
    const unavailableProductData = await unavailableProductRes.json();
    assert(
      unavailableProductRes.status === 400 &&
        !unavailableProductData.success &&
        unavailableProductData.error.includes('غير متوفرة حالياً'),
      `اختبار 9: رفض طلب يحتوي وجبة غير متاحة للبيع بنجاح: "${unavailableProductData.error}"`
    );

    // إعادة تفعيل المنتج
    await fetch(`${BASE_URL}/products/${prod1.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isAvailable: true }),
    });

    // ----------------------------------------------------
    // اختبار 10: تغيير سعر Product بعد إنشاء الطلب (التجميد التاريخي)
    // ----------------------------------------------------
    // إنشاء طلب بسعر prod2 الحالي (750 دج)
    const orderBeforePriceChangeRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'فحص ثبات السعر التاريخي',
        customerPhone: '0550123456',
        wilaya: 'الجزائر العاصمة',
        commune: testZone.commune,
        neighborhood: 'حي التيليملي',
        address: 'شارع 1',
        deliveryZoneId: testZone.id,
        items: [{ productId: prod2.id, quantity: 1 }],
      }),
    });
    const orderBeforeData = (await orderBeforePriceChangeRes.json()).data;
    const oldSavedPrice = orderBeforeData.items[0].unitPrice;

    // الآن يرفع المطعم سعر الوجبة عبر API الإدارة إلى 950 دج
    await fetch(`${BASE_URL}/products/${prod2.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ price: 950 }),
    });

    // قراءة الطلب السابق من الخادم والتحقق أن سعره لم يتأثر
    const fetchedOldOrderRes = await fetch(`${BASE_URL}/orders/${orderBeforeData.id}`);
    const fetchedOldOrder = (await fetchedOldOrderRes.json()).data;

    assert(
      fetchedOldOrder.items[0].unitPrice === oldSavedPrice && fetchedOldOrder.items[0].unitPrice === 750,
      `اختبار 10: السعر القديم في OrderItem بقي ثابتاً (${fetchedOldOrder.items[0].unitPrice} دج) رغم ارتفاع سعر الوجبة في القائمة لاحقاً إلى 950 دج`
    );

    // استرجاع السعر الأصلي
    await fetch(`${BASE_URL}/products/${prod2.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ price: 750 }),
    });

    // ----------------------------------------------------
    // اختبار 11: الضغط عدة مرات على تأكيد الطلب (منع التكرار Idempotency)
    // ----------------------------------------------------
    const uniqueIdemKey = `idem-test-${Date.now()}`;
    const payload = {
      customerName: 'فحص التكرار',
      customerPhone: '0550123456',
      wilaya: 'الجزائر العاصمة',
      commune: testZone.commune,
      neighborhood: 'حي التيليملي',
      address: 'شارع 1',
      deliveryZoneId: testZone.id,
      items: [{ productId: prod2.id, quantity: 1 }],
      idempotencyKey: uniqueIdemKey,
    };

    // إرسال طلبين في نفس اللحظة بنفس المفتاح
    const [send1, send2] = await Promise.all([
      fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
      fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    ]);

    assert(
      send1.data.id === send2.data.id && send1.data.orderNumber === send2.data.orderNumber,
      `اختبار 11: منع الطلبات المكررة بنجاح عند الضغط المتكرر (تم إرجاع نفس رقم الطلب: ${send1.data.orderNumber})`
    );

    // ----------------------------------------------------
    // اختبار 12: مستخدم غير مصرح له يحاول الوصول لطلبات الإدارة (رفض 401)
    // ----------------------------------------------------
    const unauthOrdersRes = await fetch(`${BASE_URL}/admin/orders`);
    assert(
      unauthOrdersRes.status === 401,
      `اختبار 12: حماية مسار طلبات الإدارة بنجاح من الوصول غير المصرح به (كود الرد: 401 Unauthorized)`
    );

    // ----------------------------------------------------
    // اختبار 13: فحص الصلاحيات ADMIN / MANAGER / DELIVERY
    // ----------------------------------------------------
    // تسجيل دخول MANAGER
    const mgrLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@elbahdja.dz', password: 'Manager@123456' }),
    });
    const mgrToken = (await mgrLoginRes.json()).data.token;

    // تسجيل دخول DELIVERY
    const delLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'delivery@elbahdja.dz', password: 'Delivery@123456' }),
    });
    const delToken = (await delLoginRes.json()).data.token;

    // فحص وصول ADMIN و MANAGER
    const adminAccessRes = await fetch(`${BASE_URL}/admin/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const mgrAccessRes = await fetch(`${BASE_URL}/admin/orders`, {
      headers: { Authorization: `Bearer ${mgrToken}` },
    });

    // فحص حظر DELIVERY من إدارة الطلبات
    const delAccessRes = await fetch(`${BASE_URL}/admin/orders`, {
      headers: { Authorization: `Bearer ${delToken}` },
    });

    assert(
      adminAccessRes.status === 200 && mgrAccessRes.status === 200 && delAccessRes.status === 403,
      `اختبار 13: التحقق من الصلاحيات (ADMIN = 200 متاح، MANAGER = 200 متاح، DELIVERY = 403 محظور)`
    );

    // تحديث حالة الطلب من قِبل ADMIN (NEW -> CONFIRMED -> PREPARING)
    const updateStatusRes = await fetch(`${BASE_URL}/admin/orders/${send1.data.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'CONFIRMED' }),
    });
    const updateStatusData = await updateStatusRes.json();
    assert(
      updateStatusRes.status === 200 && updateStatusData.data.status === 'CONFIRMED',
      `اختبار إضافي: تحديث حالة الطلب ${send1.data.orderNumber} إلى CONFIRMED بنجاح من قِبل الإدارة`
    );

    // فحص تتبع الطلب برقم الطلب السهل GET /api/orders/track/:orderNumber
    const trackRes = await fetch(`${BASE_URL}/orders/track/${encodeURIComponent(send1.data.orderNumber)}`);
    const trackData = await trackRes.json();
    assert(
      trackRes.status === 200 && trackData.data.orderNumber === send1.data.orderNumber,
      `اختبار إضافي: تتبع الطلب بالرقم السهل ${send1.data.orderNumber} يعمل بنجاح`
    );

    console.log('\n====================================================');
    console.log(`اكتملت الاختبارات بنجاح: ${passedTests} من ${passedTests + failedTests} اختبار ناجح`);
    console.log('====================================================');

    process.exit(failedTests > 0 ? 1 : 0);
  } catch (error) {
    console.error('خطأ غير متوقع أثناء تشغيل الاختبارات:', error);
    process.exit(1);
  }
}

runTests();

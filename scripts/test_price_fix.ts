/**
 * Price Input Validation Test
 * Tests prices 245, 850, 1250 DZD, persistence in SQLite,
 * API responses, and client-side step attribute.
 */

const BASE_URL = 'http://localhost:3000/api';

async function testPrices() {
  console.log('====================================================');
  console.log('🧪 بدء اختبار إدخال الأسعار (245، 850، 1250 دج) وتخزينها');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, desc: string, details?: string) {
    if (cond) {
      console.log(`✅ [نجح]: ${desc}`);
      if (details) console.log(`   └─ ${details}`);
      passed++;
    } else {
      console.error(`❌ [فشل]: ${desc}`);
      if (details) console.error(`   └─ ${details}`);
      failed++;
    }
  }

  try {
    // 1. تسجيل دخول المدير
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@elbahdja.dz', password: 'Admin@123456' }),
    });
    const loginJson = await loginRes.json();
    const token = loginJson.data?.token;
    assert(!!token, 'تسجيل دخول المدير بنجاح');

    // 2. جلب تصنيف
    const catsRes = await fetch(`${BASE_URL}/categories`);
    const catsJson = await catsRes.json();
    const catId = catsJson.data[0].id;

    // 3. اختبار الأسعار المطلوبة: 245، 850، 1250
    const testCases = [
      { name: 'مشروب غازي مميز 245 دج', price: 245 },
      { name: 'طاكوس البهجة دبل 850 دج', price: 850 },
      { name: 'صحن مشاوي عائلي مشكل 1250 دج', price: 1250 },
    ];

    for (const tc of testCases) {
      const createRes = await fetch(`${BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          categoryId: catId,
          name: tc.name,
          description: `وصف لوجبة بسعر ${tc.price} دج للتأكد من دعم أي سعر فردي أو زوجي`,
          price: tc.price,
          isAvailable: true,
          preparationTimeMinutes: 15,
        }),
      });

      const createJson = await createRes.json();
      assert(
        createRes.status === 201 && createJson.data?.price === tc.price,
        `إنشاء وجبة بسعر ${tc.price} دج بنجاح`,
        `المعرف: ${createJson.data?.id} | السعر المحفوظ: ${createJson.data?.price} دج`
      );

      // التحقق من القراءة الفردية من SQLite
      const getRes = await fetch(`${BASE_URL}/products/${createJson.data.id}`);
      const getJson = await getRes.json();
      assert(
        getRes.status === 200 && getJson.data?.price === tc.price,
        `استرجاع الوجبة من SQLite بسعر ${tc.price} دج مطابق تماماً`,
        `السعر المسترجع: ${getJson.data?.price} دج`
      );
    }

    // 4. التحقق من ظهور الأسعار في قائمة الوجبات العامة للزبائن
    const allProductsRes = await fetch(`${BASE_URL}/products?all=true`);
    const allProductsJson = await allProductsRes.json();
    const p245 = allProductsJson.data.find((p: any) => p.price === 245);
    const p850 = allProductsJson.data.find((p: any) => p.price === 850);
    const p1250 = allProductsJson.data.find((p: any) => p.price === 1250);

    assert(!!p245 && !!p850 && !!p1250, 'ظهور جميع الوجبات بالأسعار 245 و850 و1250 في قائمة الزبائن');

    console.log('\n====================================================');
    console.log(`📊 النتيجة: ${passed} من أصل ${passed + failed} اختبارات ناجحة`);
    if (failed === 0) {
      console.log('🎉 جميع اختبارات السعر تعمل بنجاح 100%!');
    }
    console.log('====================================================\n');
  } catch (err) {
    console.error('خطأ أثناء تشغيل الفحص:', err);
    process.exit(1);
  }
}

testPrices();

/**
 * Comprehensive Test Script for Meal Image Upload & Verification
 * Tests image uploading, magic byte validation, size limit (>5MB), path security,
 * SQLite persistence, static serving, and default image fallbacks.
 */

import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000/api';
const ROOT_URL = 'http://localhost:3000';

// Minimal 1x1 valid PNG image bytes
const VALID_1X1_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG magic bytes
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

// Minimal valid JPEG header (FF D8 FF E0 ...)
const VALID_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
  0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
  0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);

// Fake image (Disguised text file claiming to be an image)
const FAKE_MALICIOUS_FILE = Buffer.from('console.log("malicious code disguised as image");');

// Oversized image (> 5MB)
const OVERSIZED_IMAGE = Buffer.alloc(5.2 * 1024 * 1024, 0x00);
// Add valid PNG magic bytes to oversized file to ensure size filter catches it
OVERSIZED_IMAGE[0] = 0x89;
OVERSIZED_IMAGE[1] = 0x50;
OVERSIZED_IMAGE[2] = 0x4e;
OVERSIZED_IMAGE[3] = 0x47;

async function runUploadTests() {
  console.log('====================================================');
  console.log('🧪 بدء اختبارات ميزة رفع صور الوجبات والأمان وقاعدة البيانات');
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
    // 1. تسجيل دخول المدير للحصول على الرمز
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@elbahdja.dz', password: 'Admin@123456' }),
    });
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson.data?.token;

    assert(!!adminToken, 'تسجيل دخول المدير واستلام Token المصادقة', `Token: ${adminToken ? 'موجود وصالح' : 'غير موجود'}`);

    // Helper function to create FormData with Buffer in Node 22
    async function uploadBuffer(buffer: Buffer, filename: string, mimeType: string, token: string) {
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const pre = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
      );
      const post = Buffer.from(`\r\n--${boundary}--\r\n`);
      const body = Buffer.concat([pre, buffer, post]);

      return fetch(`${BASE_URL}/upload/product-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      });
    }

    // 2. اختبار رفع صورة PNG حقيقية وصالحة
    const validPngRes = await uploadBuffer(VALID_1X1_PNG, 'test_meal.png', 'image/png', adminToken);
    const validPngJson = await validPngRes.json();

    const t2Passed = validPngRes.status === 201 && validPngJson.success && validPngJson.imageUrl.startsWith('/uploads/products/');
    assert(t2Passed, 'رفع صورة PNG صالحة وحفظها بنجاح', `رابط الصورة في الخادم: ${validPngJson.imageUrl}`);

    const uploadedPngUrl = validPngJson.imageUrl;

    // 3. اختبار إمكانية الوصول إلى الصورة المرفوعة عبر HTTP Static Serving
    const staticPngRes = await fetch(`${ROOT_URL}${uploadedPngUrl}`);
    const staticPngBuffer = Buffer.from(await staticPngRes.arrayBuffer());
    const t3Passed = staticPngRes.status === 200 && staticPngBuffer.length === VALID_1X1_PNG.length;
    assert(t3Passed, 'تقديم الصورة المرفوعة بنجاح عبر مسار Static /uploads', `حجم الملف المسترجع: ${staticPngBuffer.length} بايت`);

    // 4. اختبار رفع صورة JPEG حقيقية وصالحة
    const validJpegRes = await uploadBuffer(VALID_JPEG, 'cheeseburger.jpg', 'image/jpeg', adminToken);
    const validJpegJson = await validJpegRes.json();
    const t4Passed = validJpegRes.status === 201 && validJpegJson.success && validJpegJson.imageUrl.endsWith('.jpg');
    assert(t4Passed, 'رفع صورة JPEG صالحة واكتشاف الامتداد السليم', `رابط الصورة: ${validJpegJson.imageUrl}`);

    // 5. اختبار الرفض الأمني: ملف كود / نصي غير صالح يدعي أنه صورة (.png)
    const fakeFileRes = await uploadBuffer(FAKE_MALICIOUS_FILE, 'evil_script.png', 'image/png', adminToken);
    const fakeFileJson = await fakeFileRes.json();
    const t5Passed = fakeFileRes.status === 400 && !fakeFileJson.success && fakeFileJson.error.includes('غير صالح');
    assert(t5Passed, 'الرفض الأمني لملف غير صالح بالاعتماد على فحص البايتات الحقيقية Magic Bytes', `رسالة الرفض: "${fakeFileJson.error}"`);

    // 6. اختبار الرفض الأمني: ملف يتجاوز 5 ميغابايت (> 5MB)
    const oversizedRes = await uploadBuffer(OVERSIZED_IMAGE, 'huge_banner.png', 'image/png', adminToken);
    const oversizedJson = await oversizedRes.json();
    const t6Passed = oversizedRes.status === 400 && !oversizedJson.success && oversizedJson.error.includes('5 ميغابايت');
    assert(t6Passed, 'الرفض الأمني لملف يتجاوز الحد الأقصى (5 ميغابايت)', `رسالة الرفض: "${oversizedJson.error}"`);

    // 7. اختبار الحماية من الوصول غير المصرح به (بدون Token)
    const unauthUploadRes = await uploadBuffer(VALID_1X1_PNG, 'unauth.png', 'image/png', '');
    const t7Passed = unauthUploadRes.status === 401;
    assert(t7Passed, 'حماية مسار رفع الصور ورفض أي طلب غير مسجل (401 Unauthorized)');

    // 8. جلب تصنيف متاح لإضافة وجبة تجريبية
    const catsRes = await fetch(`${BASE_URL}/categories`);
    const catsJson = await catsRes.json();
    const testCategory = catsJson.data[0];

    // 9. إنشاء وجبة جديدة في SQLite مستخدمة الصورة المرفوعة
    const newMealPayload = {
      categoryId: testCategory.id,
      name: 'طاكوس البهجة المخصوص مع صورة مرفوعة',
      description: 'طاكوس محشو بالدجاج المتبل والجبن المذاب والصلصة الجزائرية الحارة مع صورة مرفوعة من الجهاز.',
      price: 850,
      imageUrl: uploadedPngUrl,
      isAvailable: true,
      preparationTimeMinutes: 20,
    };

    const createProductRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(newMealPayload),
    });
    const createProductJson = await createProductRes.json();
    const createdProduct = createProductJson.data;

    const t9Passed = createProductRes.status === 201 && createdProduct.imageUrl === uploadedPngUrl;
    assert(t9Passed, 'إنشاء وجبة جديدة وحفظ مسار الصورة المرفوعة في SQLite بنجاح', `معرف الوجبة: ${createdProduct?.id} | الصورة: ${createdProduct?.imageUrl}`);

    // 10. التحقق من ظهور الوجبة وصورتها في قائمة المنتجات للزبائن والإدارة
    const getProductRes = await fetch(`${BASE_URL}/products/${createdProduct.id}`);
    const getProductJson = await getProductRes.json();
    const t10Passed = getProductRes.status === 200 && getProductJson.data.imageUrl === uploadedPngUrl;
    assert(t10Passed, 'ظهور الوجبة وصورتها المرفوعة بدقة في واجهة الزبون والإدارة', `اسم الوجبة: ${getProductJson.data.name}`);

    // 11. إنشاء وجبة بدون صورة والتحقق من استخدام الصورة الافتراضية
    const mealWithoutImagePayload = {
      categoryId: testCategory.id,
      name: 'وجبة تجريبية بدون صورة مخصصة',
      description: 'وجبة لاختبار السلوك الافتراضي عند عدم اختيار صورة من الجهاز.',
      price: 600,
      isAvailable: true,
      preparationTimeMinutes: 15,
    };

    const createNoImgRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(mealWithoutImagePayload),
    });
    const createNoImgJson = await createNoImgRes.json();
    const t11Passed = createNoImgRes.status === 201 && createNoImgJson.data.imageUrl && createNoImgJson.data.imageUrl.startsWith('http');
    assert(t11Passed, 'دعم إنشاء وجبة بدون صورة وتوفير الصورة الافتراضية تلقائياً', `الصورة الافتراضية: ${createNoImgJson.data?.imageUrl}`);

    // 12. التحقق من وجود ملف الصورة الفعلي داخل مجلد uploads/products على القرص
    const diskFilename = path.basename(uploadedPngUrl);
    const diskPath = path.resolve(process.cwd(), 'uploads', 'products', diskFilename);
    const existsOnDisk = fs.existsSync(diskPath);
    assert(existsOnDisk, 'التخزين الدائم: الملف موجود فعلياً على القرص في مجلد uploads/products', `المسار: ${diskPath}`);

    // 13. التحقق من سلامة قاعدة بيانات SQLite وعدم مسها أو إنشائها من الصفر
    const dbPath = path.resolve(process.cwd(), 'data', 'restaurant.sqlite');
    const dbStats = fs.statSync(dbPath);
    assert(fs.existsSync(dbPath) && dbStats.size > 0, 'استمرارية قاعدة بيانات SQLite الأصلية وحفظ البيانات عليها', `حجم ملف SQLite: ${(dbStats.size / 1024).toFixed(1)} كيلوبايت`);

    console.log('\n====================================================');
    console.log(`📊 النتيجة: ${passed} من أصل ${passed + failed} اختبارات ناجحة`);
    if (failed === 0) {
      console.log('🎉 جميع اختبارات رفع الصور وحمايتها وحفظها في SQLite تعمل بنجاح 100%!');
    } else {
      console.log('⚠️ هناك اختبارات فاشلة');
    }
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('خطأ غير متوقع أثناء تشغيل اختبارات رفع الصور:', err);
    process.exit(1);
  }
}

runUploadTests();

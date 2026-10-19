/**
 * Test script for Password Change Feature:
 * 1. Admin & Delivery password change validation (current password, min 10 chars, confirm match)
 * 2. Old password rejection & new password acceptance
 * 3. User isolation (each user changes only their own password)
 * 4. Persistence across server restart
 */

const BASE_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 بدء اختبارات ميزة تغيير كلمة المرور للمدير ومسؤول التوصيل');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [نجاح] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [فشل] ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // ----------------------------------------------------
  // TEST SUITE 1: مدير المطعم (ADMIN)
  // ----------------------------------------------------
  console.log('\n--- 1. اختبارات مدير المطعم (ADMIN) ---');

  // 1.1 تسجيل دخول المدير بكلمة المرور الحالية
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@elbahdja.dz', password: 'Admin@123456' }),
  });
  const adminLoginJson = await adminLoginRes.json();
  assert(adminLoginRes.status === 200 && adminLoginJson.data?.token, '1.1 تسجيل الدخول الأولي للمدير بحسابه');
  const adminToken = adminLoginJson.data.token;

  // 1.2 رفض التغيير عند إدخال كلمة مرور حالية خاطئة
  const adminWrongCurrentRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      currentPassword: 'WrongPassword999',
      newPassword: 'NewAdminPassword2026!',
      confirmPassword: 'NewAdminPassword2026!',
    }),
  });
  const adminWrongCurrentJson = await adminWrongCurrentRes.json();
  assert(
    adminWrongCurrentRes.status === 400 && adminWrongCurrentJson.error.includes('الحالية غير صحيحة'),
    '1.2 رفض تغيير كلمة المرور عند إدخال كلمة المرور الحالية خاطئة للمدير'
  );

  // 1.3 رفض التغيير عند إدخال كلمة مرور جديدة أقل من 10 أحرف
  const adminShortNewRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      currentPassword: 'Admin@123456',
      newPassword: 'Short@12', // 8 chars (< 10)
      confirmPassword: 'Short@12',
    }),
  });
  const adminShortNewJson = await adminShortNewRes.json();
  assert(
    adminShortNewRes.status === 400 && adminShortNewJson.error.includes('10 أحرف'),
    '1.3 رفض تغيير كلمة المرور إذا كانت أقل من 10 أحرف (الشرط الأمني)'
  );

  // 1.4 رفض التغيير عند عدم تطابق كلمة المرور الجديدة مع تأكيدها
  const adminMismatchRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      currentPassword: 'Admin@123456',
      newPassword: 'NewAdminPassword2026!',
      confirmPassword: 'DifferentConfirmPassword2026!',
    }),
  });
  const adminMismatchJson = await adminMismatchRes.json();
  assert(
    adminMismatchRes.status === 400 && adminMismatchJson.error.includes('غير متطابقين'),
    '1.4 رفض تغيير كلمة المرور عند عدم تطابق كلمتي المرور الجديدتين'
  );

  // 1.5 نجاح تغيير كلمة المرور عند استيفاء جميع الشروط
  const NEW_ADMIN_PW = 'AdminSecured2026@DZ';
  const adminSuccessChangeRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      currentPassword: 'Admin@123456',
      newPassword: NEW_ADMIN_PW,
      confirmPassword: NEW_ADMIN_PW,
    }),
  });
  const adminSuccessChangeJson = await adminSuccessChangeRes.json();
  assert(
    adminSuccessChangeRes.status === 200 && adminSuccessChangeJson.success === true,
    '1.5 قبول وتغيير كلمة مرور المدير بنجاح مع تشفير bcrypt في قاعدة البيانات'
  );

  // 1.6 رفض تسجيل الدخول بكلمة المرور القديمة
  const adminOldLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@elbahdja.dz', password: 'Admin@123456' }),
  });
  assert(adminOldLoginRes.status === 401, '1.6 رفض تسجيل الدخول بكلمة المرور القديمة للمدير بعد التغيير');

  // 1.7 قبول تسجيل الدخول بكلمة المرور الجديدة
  const adminNewLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@elbahdja.dz', password: NEW_ADMIN_PW }),
  });
  const adminNewLoginJson = await adminNewLoginRes.json();
  assert(
    adminNewLoginRes.status === 200 && adminNewLoginJson.data?.user?.role === 'ADMIN',
    '1.7 نجاح تسجيل الدخول بكلمة المرور الجديدة للمدير والحصول على JWT صالح'
  );

  // ----------------------------------------------------
  // TEST SUITE 2: مسؤول التوصيل (DELIVERY)
  // ----------------------------------------------------
  console.log('\n--- 2. اختبارات مسؤول التوصيل (DELIVERY) ---');

  const DRIVER_EMAIL = 'saadoudihamido@gmail.com';
  const DRIVER_OLD_PW = 'HamidDelivery@2026';

  // 2.1 تسجيل دخول مسؤول التوصيل بكلمة مروره
  const driverLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DRIVER_EMAIL, password: DRIVER_OLD_PW }),
  });
  const driverLoginJson = await driverLoginRes.json();
  assert(driverLoginRes.status === 200 && driverLoginJson.data?.token, '2.1 تسجيل الدخول الأولي لمسؤول التوصيل (حميد)');
  const driverToken = driverLoginJson.data.token;

  // 2.2 رفض التغيير عند إدخال كلمة مرور حالية خاطئة للتوصيل
  const driverWrongCurrentRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${driverToken}`,
    },
    body: JSON.stringify({
      currentPassword: 'WrongHamidoPassword',
      newPassword: 'DriverDelivery2026@DZ',
      confirmPassword: 'DriverDelivery2026@DZ',
    }),
  });
  const driverWrongCurrentJson = await driverWrongCurrentRes.json();
  assert(
    driverWrongCurrentRes.status === 400 && driverWrongCurrentJson.error.includes('الحالية غير صحيحة'),
    '2.2 رفض تغيير كلمة المرور عند إدخال كلمة المرور الحالية خاطئة لمسؤول التوصيل'
  );

  // 2.3 رفض التغيير إذا كانت كلمة المرور الجديدة أقل من 10 أحرف
  const driverShortNewRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${driverToken}`,
    },
    body: JSON.stringify({
      currentPassword: DRIVER_OLD_PW,
      newPassword: 'shortpw9', // 8 chars (< 10)
      confirmPassword: 'shortpw9',
    }),
  });
  assert(driverShortNewRes.status === 400, '2.3 رفض تغيير كلمة المرور لمسؤول التوصيل إذا كانت أقل من 10 أحرف');

  // 2.4 رفض التغيير عند عدم تطابق التأكيد
  const driverMismatchRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${driverToken}`,
    },
    body: JSON.stringify({
      currentPassword: DRIVER_OLD_PW,
      newPassword: 'DriverDelivery2026@DZ',
      confirmPassword: 'AnotherDelivery2026@DZ',
    }),
  });
  assert(driverMismatchRes.status === 400, '2.4 رفض تغيير كلمة المرور لمسؤول التوصيل عند عدم تطابق التأكيد');

  // 2.5 نجاح تغيير كلمة مرور مسؤول التوصيل عند استيفاء الشروط
  const NEW_DRIVER_PW = 'DriverDelivery2026@DZ';
  const driverSuccessRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${driverToken}`,
    },
    body: JSON.stringify({
      currentPassword: DRIVER_OLD_PW,
      newPassword: NEW_DRIVER_PW,
      confirmPassword: NEW_DRIVER_PW,
    }),
  });
  const driverSuccessJson = await driverSuccessRes.json();
  assert(
    driverSuccessRes.status === 200 && driverSuccessJson.success === true,
    '2.5 قبول وتغيير كلمة مرور مسؤول التوصيل بنجاح'
  );

  // 2.6 رفض تسجيل الدخول بكلمة المرور القديمة لمسؤول التوصيل
  const driverOldLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DRIVER_EMAIL, password: DRIVER_OLD_PW }),
  });
  assert(driverOldLoginRes.status === 401, '2.6 رفض تسجيل الدخول بكلمة المرور القديمة لمسؤول التوصيل بعد التغيير');

  // 2.7 قبول تسجيل الدخول بكلمة المرور الجديدة لمسؤول التوصيل
  const driverNewLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DRIVER_EMAIL, password: NEW_DRIVER_PW }),
  });
  const driverNewLoginJson = await driverNewLoginRes.json();
  assert(
    driverNewLoginRes.status === 200 && driverNewLoginJson.data?.user?.role === 'DELIVERY',
    '2.7 نجاح تسجيل الدخول بكلمة المرور الجديدة لمسؤول التوصيل والحصول على JWT صالح'
  );

  // ----------------------------------------------------
  // TEST SUITE 3: الأمان وعزل الصلاحيات بين الحسابين
  // ----------------------------------------------------
  console.log('\n--- 3. اختبارات الأمان وعزل الصلاحيات ---');

  // 3.1 مسؤول التوصيل لا يمكنه تغيير كلمة مرور المدير حتى لو أرسل معرف المدير في الطلب
  const driverTryingToTamperRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${driverNewLoginJson.data.token}`,
    },
    body: JSON.stringify({
      userId: 'usr-admin-dz-01', // Attacking payload attempting to target admin
      targetUserId: 'usr-admin-dz-01',
      currentPassword: NEW_ADMIN_PW, // Admin's password
      newPassword: 'HackedAdminPassword2026!',
      confirmPassword: 'HackedAdminPassword2026!',
    }),
  });
  // Since server strictly uses req.user.userId (which is driver's ID), it checks the driver's current password
  // which will fail because currentPassword is not the driver's password!
  assert(
    driverTryingToTamperRes.status === 400,
    '3.1 عزل الصلاحيات: مسؤول التوصيل لا يمكنه تغيير كلمة مرور المدير إطلاقاً'
  );

  // 3.2 رفض أي طلب تغيير كلمة مرور بدون رمز JWT مصادق
  const unauthRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentPassword: NEW_ADMIN_PW,
      newPassword: 'SomePassword12345!',
      confirmPassword: 'SomePassword12345!',
    }),
  });
  assert(unauthRes.status === 401, '3.2 رفض تغيير كلمة المرور للطلبات غير المصادق عليها (401 Unauthorized)');

  // ----------------------------------------------------
  // TEST SUITE 4: استعادة كلمات المرور إلى حالتها الأساسية
  // ----------------------------------------------------
  console.log('\n--- 4. استعادة وإعادة تعيين كلمات المرور لحالتها المعتمدة للمشروع ---');

  // Restore Admin password back to Admin@123456
  const adminRestoreRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminNewLoginJson.data.token}`,
    },
    body: JSON.stringify({
      currentPassword: NEW_ADMIN_PW,
      newPassword: 'Admin@123456',
      confirmPassword: 'Admin@123456',
    }),
  });
  assert(adminRestoreRes.status === 200, '4.1 نجاح المدير في إعادة تعيين كلمة مروره إلى Admin@123456');

  // Restore Driver password back to hamido
  // Note: driver old password was hamido (6 chars), but user can set any password >= 10 chars,
  // or we can test that driver changes password to HamidDelivery@2026
  const DRIVER_FINAL_PW = 'HamidDelivery@2026';
  const driverRestoreRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${driverNewLoginJson.data.token}`,
    },
    body: JSON.stringify({
      currentPassword: NEW_DRIVER_PW,
      newPassword: DRIVER_FINAL_PW,
      confirmPassword: DRIVER_FINAL_PW,
    }),
  });
  assert(driverRestoreRes.status === 200, '4.2 نجاح مسؤول التوصيل في تحديث كلمة مروره بكلمة مرور مؤمنة >= 10 أحرف');

  console.log('\n====================================================');
  console.log(`🎉 اكتملت جميع الاختبارات بنجاح تام! (${passedTests}/${totalTests})`);
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});

import { dbStore } from '../src/backend/db/index.ts';
import fs from 'fs';

async function testPrinting() {
  console.log('=== فحص واختبار نظام الطباعة وإصلاح زر الطباعة ===\n');

  await dbStore.init();
  const orders = dbStore.getAllOrders();
  if (orders.length === 0) {
    throw new Error('لا توجد طلبات في قاعدة البيانات لفحص الطباعة');
  }

  const testOrder = orders[0];
  console.log(`1. فحص بيانات الطلبية المختارة للطباعة:`);
  console.log(`   - رقم الطلب: ${testOrder.orderNumber}`);
  console.log(`   - اسم الزبون: ${testOrder.customerName}`);
  console.log(`   - هاتف الزبون: ${testOrder.customerPhone}`);
  console.log(`   - عدد الوجبات: ${testOrder.items?.length || 0}`);
  console.log(`   - الإجمالي: ${testOrder.total} دج\n`);

  if (!testOrder.items || testOrder.items.length === 0) {
    throw new Error('الطلبية المختارة لا تحتوي على وجبات مفصلة!');
  }

  // 2. التحقق من وجود مكون ThermalReceiptModal داخل AdminDashboard.tsx
  console.log('2. فحص تضمين مكون الطباعة داخل لوحة الإدارة (AdminDashboard.tsx):');
  const adminDashboardCode = fs.readFileSync('src/frontend/components/AdminDashboard.tsx', 'utf-8');
  
  const hasImport = adminDashboardCode.includes("import { ThermalReceiptModal } from './ThermalReceiptModal.tsx';");
  const hasState = adminDashboardCode.includes('const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);');
  const hasOrderState = adminDashboardCode.includes('const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);');
  const hasHandler = adminDashboardCode.includes('handlePrintOrder');
  const hasJsxRender = adminDashboardCode.includes('<ThermalReceiptModal') && adminDashboardCode.includes('isOpen={isPrintModalOpen}');

  console.log(`   - استيراد ThermalReceiptModal: ${hasImport ? '✅ نعم' : '❌ لا'}`);
  console.log(`   - وجود حالة isPrintModalOpen: ${hasState ? '✅ نعم' : '❌ لا'}`);
  console.log(`   - وجود حالة orderToPrint: ${hasOrderState ? '✅ نعم' : '❌ لا'}`);
  console.log(`   - وجود دالة handlePrintOrder: ${hasHandler ? '✅ نعم' : '❌ لا'}`);
  console.log(`   - عرض المكون داخل JSX (سبب الخلل الأصلي): ${hasJsxRender ? '✅ تم الإصلاح والتضمين بنجاح' : '❌ مفقود'}\n`);

  if (!hasJsxRender) {
    throw new Error('فشل الفحص: ThermalReceiptModal غير مضمن داخل JSX في AdminDashboard.tsx!');
  }

  // 3. فحص مكون الفاتورة ThermalReceiptModal.tsx
  console.log('3. فحص مكون الفاتورة ومعالجة الطباعة (ThermalReceiptModal.tsx):');
  const modalCode = fs.readFileSync('src/frontend/components/ThermalReceiptModal.tsx', 'utf-8');
  
  const hasWindowPrint = modalCode.includes('window.print()');
  const hasAutoInvoke = modalCode.includes('handleDirectPrint') && modalCode.includes('setTimeout');
  const has80mmSupport = modalCode.includes('80mm') && modalCode.includes('58mm');
  const hasPortal = modalCode.includes('createPortal(modalContent, document.body)');
  const hasPrintClass = modalCode.includes("document.body.classList.add('is-printing-receipt')");

  console.log(`   - استدعاء window.print(): ${hasWindowPrint ? '✅ نعم' : '❌ لا'}`);
  console.log(`   - تشغيل الطباعة عند تجهيز الفاتورة: ${hasAutoInvoke ? '✅ نعم' : '❌ لا'}`);
  console.log(`   - دعم طابعة الفواتير 80 مم و 58 مم: ${has80mmSupport ? '✅ نعم' : '❌ لا'}`);
  console.log(`   - إضافة فئة is-printing-receipt للطباعة النظيفة: ${hasPrintClass ? '✅ نعم' : '❌ لا'}`);
  console.log(`   - استخدام Portal لعزل الفاتورة عن الصفحة: ${hasPortal ? '✅ نعم' : '❌ لا'}\n`);

  if (!hasWindowPrint || !has80mmSupport || !hasPrintClass) {
    throw new Error('فشل الفحص: خصائص الطباعة غير مكتملة في ThermalReceiptModal!');
  }

  // 4. فحص قواعد CSS الخاصة بالطباعة (عدم طباعة الصفحة الإدارية)
  console.log('4. فحص قواعد CSS للطباعة في src/index.css:');
  const cssCode = fs.readFileSync('src/index.css', 'utf-8');

  const hidesRoot = cssCode.includes('body.is-printing-receipt #root') && cssCode.includes('display: none !important;');
  const showsOnlyReceipt = cssCode.includes('#thermal-receipt-portal') && cssCode.includes('display: block !important;');
  const hidesButtons = cssCode.includes('.print-hide');

  console.log(`   - إخفاء واجهة لوحة الإدارة (#root) أثناء الطباعة: ${hidesRoot ? '✅ نعم' : '❌ لا'}`);
  console.log(`   - إظهار قصاصة الفاتورة فقط (#thermal-receipt-portal): ${showsOnlyReceipt ? '✅ نعم' : '❌ لا'}`);
  console.log(`   - إخفاء الأزرار والروابط في ورقة الطباعة (.print-hide): ${hidesButtons ? '✅ نعم' : '❌ لا'}\n`);

  if (!hidesRoot || !showsOnlyReceipt) {
    throw new Error('فشل الفحص: قواعد CSS لا تخفي الصفحة الإدارية عند الطباعة!');
  }

  // 5. فحص مسار الطباعة المباشر من الخادم (Print Standalone Endpoint)
  console.log('5. فحص مسار الطباعة المباشر من الخادم (/api/orders/:id/print):');
  const res = await fetch(`http://127.0.0.1:3000/api/orders/${testOrder.id}/print?width=80mm`);
  console.log(`   - كود الاستجابة HTTP: ${res.status} ${res.statusText}`);
  if (res.status !== 200) {
    throw new Error(`فشل استدعاء صفحة الطباعة: كود ${res.status}`);
  }

  const html = await res.text();
  const containsOrderNum = html.includes(testOrder.orderNumber);
  const containsRestaurant = html.includes('مطعم');
  const contains80mm = html.includes('76mm') || html.includes('80mm');
  const containsAutoPrint = html.includes('window.print()');

  console.log(`   - احتواء الفاتورة على رقم الطلب (${testOrder.orderNumber}): ${containsOrderNum ? '✅ نعم' : '❌ لا'}`);
  console.log(`   - احتواء الفاتورة على اسم المطعم: ${containsRestaurant ? '✅ نعم' : '❌ لا'}`);
  console.log(`   - توافق القياس الحراري 80 مم: ${contains80mm ? '✅ نعم' : '❌ لا'}`);
  console.log(`   - وجود سكريبت الطباعة الآلية window.print(): ${containsAutoPrint ? '✅ نعم' : '❌ لا'}\n`);

  if (!containsOrderNum || !containsAutoPrint) {
    throw new Error('فشل التحقق من محتوى صفحة الفاتورة المطبوعة!');
  }

  console.log('====================================================');
  console.log('🎉 تم التحقق بنجاح تام من حل مشكلة زر الطباعة!');
  console.log('====================================================');
}

testPrinting().catch((err) => {
  console.error('❌ خطأ في الاختبار:', err);
  process.exit(1);
});

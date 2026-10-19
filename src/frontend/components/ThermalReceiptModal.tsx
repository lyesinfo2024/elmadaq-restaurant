import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  Check,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import { Order } from '../types/index.ts';
import { formatDZD, formatAlgerianPhone, formatAlgerianDateTime } from '../utils/formatters.ts';

interface ThermalReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  restaurantName?: string;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  order,
  isOpen,
  onClose,
  restaurantName = 'مطعم المذاق',
}) => {
  // Support 80mm (default) and 58mm with memory in localStorage
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>(() => {
    try {
      const saved = localStorage.getItem('thermal_receipt_paper_width');
      return saved === '58mm' ? '58mm' : '80mm';
    } catch {
      return '80mm';
    }
  });

  const [diagnosticInfo, setDiagnosticInfo] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const [printSuccess, setPrintSuccess] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    setIsInIframe(typeof window !== 'undefined' && window.self !== window.top);
  }, []);

  const handleWidthChange = (width: '80mm' | '58mm') => {
    setPaperWidth(width);
    try {
      localStorage.setItem('thermal_receipt_paper_width', width);
    } catch {
      // ignore
    }
  };

  /**
   * Direct user click print handler
   */
  const handleDirectPrint = () => {
    const time = new Date().toLocaleTimeString('ar-DZ');
    console.log(`[ThermalReceipt] زر «طباعة الآن» نُقر عليه في الساعة ${time} للطلب ${order?.orderNumber}`);

    if (!order) {
      setPrintError('خطأ: لم يتم تحديد أي طلب للطباعة.');
      return;
    }

    // 1. Immediate visual confirmation of click receipt
    setDiagnosticInfo(`✓ تم استلام نقرة زر الطباعة (${time}) — جاري توجيه الأمر للمتصفح...`);
    setPrintError(null);
    setPrintSuccess(null);

    // 2. Direct window.print() invocation
    try {
      window.focus();
      window.print();

      // If running inside an iframe, Chromium silently drops window.print() without throwing
      if (typeof window !== 'undefined' && window.self !== window.top) {
        setDiagnosticInfo(
          `⚠️ تنبيه: متصفحك يمنع فتح نافذة الطباعة داخل إطار المعاينة المضمن (IFrame). اضغط على زر «فتح القصاصة في لسان مستقل» أدناه للطباعة فوراً.`
        );
      } else {
        setPrintSuccess('تم تنفيذ أمر الطباعة window.print() بنجاح.');
      }
    } catch (err: unknown) {
      console.error('[ThermalReceipt] window.print() exception:', err);
      const msg = err instanceof Error ? err.message : 'خطأ غير معروف';
      setPrintError(`تعذر فتح نافذة الطباعة (${msg}). استخدم زر «فتح القصاصة في لسان مستقل» أدناه.`);
    }
  };

  /**
   * Copy receipt text to clipboard
   */
  const handleCopyReceiptText = async () => {
    if (!order) return;
    try {
      const itemsList = (order.items || [])
        .map((i) => `• ${i.quantity} × ${i.productName}: ${formatDZD(i.totalPrice)}`)
        .join('\n');

      const text = [
        `=== ${restaurantName || 'مطعم المذاق'} ===`,
        `وصل طلبية زبون`,
        `-----------------------------`,
        `رقم الطلب: ${order.orderNumber}`,
        `اسم الزبون: ${order.customerName || '—'}`,
        order.customerPhone ? `رقم الهاتف: ${formatAlgerianPhone(order.customerPhone)}` : null,
        `منطقة التوصيل: ${order.commune}${order.neighborhood ? ` (${order.neighborhood})` : ''}`,
        order.address ? `العنوان: ${order.address}` : null,
        `تاريخ الطلب: ${formatAlgerianDateTime(order.createdAt)}`,
        itemsList ? `-----------------------------\nالوجبات:\n${itemsList}` : null,
        order.deliveryFee > 0 ? `سعر التوصيل: ${formatDZD(order.deliveryFee)}` : null,
        `-----------------------------`,
        `المجموع النهائي: ${formatDZD(order.total)}`,
        `الدفع: نقداً عند الاستلام`,
        order.notes ? `ملاحظة: ${order.notes}` : null,
        `-----------------------------`,
        `شكراً لطلبكم!`,
      ]
        .filter(Boolean)
        .join('\n');

      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch {
      setPrintError('تعذر نسخ بيانات القصاصة إلى الحافظة');
    }
  };

  useEffect(() => {
    if (isOpen && order) {
      document.body.classList.add('is-printing-receipt');
      setDiagnosticInfo(null);
      setPrintError(null);
      setPrintSuccess(null);

      // تشغيل نافذة الطباعة تلقائياً بعد استقرار عناصر الفاتورة في الواجهة
      const timer = setTimeout(() => {
        handleDirectPrint();
      }, 200);

      return () => {
        clearTimeout(timer);
        document.body.classList.remove('is-printing-receipt');
      };
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const printStandaloneUrl = `/api/orders/${encodeURIComponent(order.id)}/print?width=${paperWidth}`;

  const modalContent = (
    <div
      id="thermal-receipt-portal"
      className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-stone-950/80 backdrop-blur-xs print:static print:p-0 print:m-0 print:bg-white print:overflow-visible"
    >
      {/* Modal Dialog Card */}
      <div
        id="thermal-receipt-modal-card"
        className="relative w-full max-w-lg bg-stone-900 rounded-3xl shadow-2xl overflow-hidden border border-stone-800 text-stone-100 animate-in zoom-in-95 duration-200 print:bg-white print:border-none print:shadow-none print:w-full print:max-w-none print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Screen Header (Hidden on print) */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between print-hide bg-stone-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white">معاينة طباعة الطلبية</h3>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {order.orderNumber}
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                قصاصة حرارية لطابعة الفواتير (Xprinter 80mm / 58mm)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
            title="إغلاق المعاينة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Paper Width Selector & Primary Print Button (Hidden on print) */}
        <div className="p-4 bg-stone-800/60 border-b border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 print-hide">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-stone-300 shrink-0">عرض الورق:</span>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-900 rounded-xl border border-stone-700/60 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleWidthChange('80mm')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  paperWidth === '80mm'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>80 مم (الافتراضي)</span>
                {paperWidth === '80mm' && <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => handleWidthChange('58mm')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  paperWidth === '58mm'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>58 مم</span>
                {paperWidth === '58mm' && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Primary Print Button */}
          <button
            type="button"
            onClick={handleDirectPrint}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs transition-all shadow-xs cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الآن (Xprinter)</span>
          </button>
        </div>

        {/* Immediate Diagnostic / Status Alerts (Hidden on print) */}
        {diagnosticInfo && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-stone-800 border border-stone-700 text-amber-300 text-xs flex items-center gap-2 print-hide animate-in fade-in">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
            <span>{diagnosticInfo}</span>
          </div>
        )}

        {/* Iframe Environment Notice */}
        {isInIframe && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-950/60 border border-amber-600/40 text-amber-200 text-xs flex flex-col gap-2 print-hide">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>بيئة المعاينة (IFrame):</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-200/90">
              يحظر المتصفح فتح نافذة الطباعة التلقائية داخل إطار المعاينة الداخلي. للطباعة الفعلية المباشرة بطابعة Xprinter:
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <a
                href={printStandaloneUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-colors shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>فتح القصاصة وطباعتها في لسان جديد</span>
              </a>
              <span className="text-[10px] text-stone-400">أو افتح التطبيق في نافذة مستقلة.</span>
            </div>
          </div>
        )}

        {printError && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-red-950/60 border border-red-700/60 text-red-300 text-xs flex items-center gap-2 print-hide animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{printError}</span>
          </div>
        )}

        {printSuccess && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2 print-hide animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{printSuccess}</span>
          </div>
        )}

        {/* Preview Container on screen */}
        <div
          id="thermal-receipt-preview-wrapper"
          className="p-4 sm:p-6 bg-stone-950/50 flex flex-col items-center justify-center max-h-[58vh] overflow-y-auto print:max-h-none print:p-0 print:bg-white print:overflow-visible"
        >
          {/* Printable Thermal Receipt Slip */}
          <div
            id="thermal-receipt-printable-slip"
            className="thermal-receipt-slip font-cairo text-black bg-white select-text shadow-xl border border-stone-300 rounded-md print:rounded-none print:shadow-none print:border-none"
            dir="rtl"
            style={{
              width: paperWidth === '58mm' ? '54mm' : '76mm',
              maxWidth: paperWidth === '58mm' ? '54mm' : '76mm',
              margin: '0 auto',
              padding: paperWidth === '58mm' ? '4mm 2mm' : '6mm 3mm',
              color: '#000000',
              backgroundColor: '#ffffff',
              lineHeight: 1.35,
              fontSize: paperWidth === '58mm' ? '11px' : '13px',
              fontFamily: "'Cairo', 'Tajawal', system-ui, -apple-system, sans-serif",
            }}
          >
            {/* 1. اسم المطعم */}
            <div className="text-center pb-2">
              <h1
                className={`font-black tracking-wide ${
                  paperWidth === '58mm' ? 'text-base' : 'text-xl'
                }`}
                style={{ fontWeight: 900 }}
              >
                {restaurantName || 'مطعم المذاق'}
              </h1>
              <p className="text-[10px] text-black/80 font-bold mt-0.5">
                وصل طلبية زبون
              </p>
            </div>

            {/* فاصل */}
            <div className="border-b-2 border-dashed border-black my-2" />

            {/* 2. رقم الطلب (بارز وسهل القراءة) */}
            <div className="text-center py-1">
              <span className="text-[11px] block font-bold">رقم الطلب</span>
              <span
                className={`block font-black font-mono tracking-wider ${
                  paperWidth === '58mm' ? 'text-xl' : 'text-2xl'
                }`}
                style={{ fontWeight: 900 }}
              >
                {order.orderNumber}
              </span>
            </div>

            {/* فاصل */}
            <div className="border-b border-dashed border-black my-2" />

            {/* 3. اسم الزبون، رقم الهاتف، منطقة التوصيل، تاريخ الطلب ووقته */}
            <div className="space-y-1.5 py-1">
              {/* اسم الزبون */}
              <div className="flex justify-between items-start gap-1">
                <span className="font-bold shrink-0">اسم الزبون:</span>
                <span className="font-black text-left">{order.customerName || '—'}</span>
              </div>

              {/* رقم الهاتف */}
              {order.customerPhone ? (
                <div className="flex justify-between items-center gap-1">
                  <span className="font-bold shrink-0">رقم الهاتف:</span>
                  <span dir="ltr" className="font-mono font-bold text-left">
                    {formatAlgerianPhone(order.customerPhone)}
                  </span>
                </div>
              ) : null}

              {/* منطقة التوصيل */}
              <div className="flex justify-between items-start gap-1">
                <span className="font-bold shrink-0">منطقة التوصيل:</span>
                <span className="font-bold text-left">
                  {order.commune}
                  {order.neighborhood ? ` (${order.neighborhood})` : ''}
                </span>
              </div>

              {/* العنوان التفصيلي إذا كان محفوظاً */}
              {order.address ? (
                <div className="flex justify-between items-start gap-1 text-[11px]">
                  <span className="font-bold shrink-0">العنوان:</span>
                  <span className="text-left font-medium">{order.address}</span>
                </div>
              ) : null}

              {/* تاريخ الطلب ووقته */}
              <div className="flex justify-between items-start gap-1">
                <span className="font-bold shrink-0">تاريخ الطلب:</span>
                <span className="text-left text-[11px] font-bold">
                  {formatAlgerianDateTime(order.createdAt)}
                </span>
              </div>
            </div>

            {/* قائمة الوجبات في الطلب */}
            {order.items && order.items.length > 0 && (
              <>
                <div className="border-b border-dashed border-black my-2" />
                <div className="py-1">
                  <div className="font-black mb-1.5 pb-1 border-b border-dotted border-black/60 flex justify-between text-[11px]">
                    <span>الوجبة / الصنف</span>
                    <span>المبلغ</span>
                  </div>
                  <div className="space-y-1.5">
                    {order.items.map((item, idx) => (
                      <div key={item.id || idx} className="space-y-0.5">
                        <div className="flex justify-between items-start gap-1 font-bold">
                          <span className="text-right leading-tight">
                            {item.quantity} × {item.productName}
                          </span>
                          <span className="font-mono font-black shrink-0">
                            {formatDZD(item.totalPrice)}
                          </span>
                        </div>
                        {item.notes ? (
                          <div className="text-[10px] pr-2 text-black/75 italic">
                            * {item.notes}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {/* تفاصيل المجموع الفرعي والتوصيل إذا وجد سعر توصيل */}
                  {order.deliveryFee > 0 ? (
                    <div className="mt-2 pt-1 border-t border-dotted border-black/60 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span>مجموع الوجبات:</span>
                        <span className="font-mono">{formatDZD(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>سعر التوصيل:</span>
                        <span className="font-mono">{formatDZD(order.deliveryFee)}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            )}

            {/* فاصل عريض */}
            <div className="border-b-2 border-dashed border-black my-2" />

            {/* 4. المجموع النهائي بالدينار الجزائري (دج) بارز وسهل القراءة */}
            <div className="py-2 text-center">
              <span className="text-[11px] block font-bold mb-0.5">المجموع النهائي:</span>
              <span
                className={`block font-black font-mono tracking-wide ${
                  paperWidth === '58mm' ? 'text-lg' : 'text-2xl'
                }`}
                style={{ fontWeight: 900 }}
              >
                {formatDZD(order.total)}
              </span>
              <span className="text-[10px] block font-bold mt-1 text-black/90">
                (الدفع نقداً عند الاستلام)
              </span>
            </div>

            {/* ملاحظات الزبون إن وُجدت */}
            {order.notes ? (
              <>
                <div className="border-b border-dashed border-black my-2" />
                <div className="py-1 text-[11px]">
                  <span className="font-bold block mb-0.5">ملاحظة الزبون:</span>
                  <p className="font-medium pr-1">{order.notes}</p>
                </div>
              </>
            ) : null}

            {/* عامل التوصيل إن وُجد */}
            {order.deliveryPerson ? (
              <>
                <div className="border-b border-dashed border-black my-2" />
                <div className="py-1 text-[11px] flex justify-between items-center">
                  <span className="font-bold">عامل التوصيل:</span>
                  <span className="font-bold">
                    {order.deliveryPerson.name} ({order.deliveryPerson.phone})
                  </span>
                </div>
              </>
            ) : null}

            {/* التذييل */}
            <div className="border-b border-dashed border-black my-2" />
            <div className="text-center pt-1 pb-1 space-y-1 text-[10px]">
              <p className="font-bold">شكراً لطلبكم من {restaurantName || 'مطعم المذاق'}</p>
              <p>نتمنى لكم وجبة شهية وعافية!</p>
              <p className="font-mono text-[9px] text-black/60 pt-0.5">
                *** {order.orderNumber} ***
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions & Options (Hidden on print) */}
        <div className="p-4 bg-stone-900 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 print-hide text-xs text-stone-400">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={printStandaloneUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-initial"
              title="فتح القصاصة في صفحة مستقلة للطباعة المباشرة"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>لسان مستقل للطباعة</span>
            </a>

            <button
              type="button"
              onClick={handleCopyReceiptText}
              className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-initial"
              title="نسخ نص القصاصة إلى الحافظة"
            >
              {copySuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-400" />
                  <span>نسخ القصاصة</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleDirectPrint}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs w-full sm:w-auto"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الآن</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

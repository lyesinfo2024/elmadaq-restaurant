import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext.tsx';
import { useRestaurant } from '../context/RestaurantContext.tsx';
import { DeliveryZone, Order } from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatDZD, isValidAlgerianPhone } from '../utils/formatters.ts';
import {
  X,
  MapPin,
  User,
  Phone,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  FileText,
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
}

export function CheckoutModal({ isOpen, onClose, onOrderSuccess }: CheckoutModalProps) {
  const { items, subtotal, clearCart } = useCart();
  const { restaurant } = useRestaurant();

  const [step, setStep] = useState<'info' | 'review'>('info');
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [wilaya, setWilaya] = useState('الجزائر العاصمة (16)');
  const [daira, setDaira] = useState('');
  const [commune, setCommune] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');

  // Submit states & idempotency
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  // Load delivery zones
  useEffect(() => {
    if (isOpen) {
      setLoadingZones(true);
      setError(null);
      api
        .getDeliveryZones()
        .then((zones) => {
          setDeliveryZones(zones);
          if (zones.length > 0) {
            setSelectedZoneId(zones[0].id);
            setCommune(zones[0].commune);
            setWilaya(zones[0].wilaya);
          }
        })
        .catch((err) => {
          console.error(err);
          setError('تعذر تحميل مناطق التوصيل، يرجى المحاولة لاحقاً');
        })
        .finally(() => setLoadingZones(false));

      // Generate a fresh idempotency key per checkout session
      setIdempotencyKey(`idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
      setStep('info');
    }
  }, [isOpen]);

  // When zone changes, update commune
  const handleZoneChange = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    const z = deliveryZones.find((item) => item.id === zoneId);
    if (z) {
      setCommune(z.commune);
      setWilaya(z.wilaya);
    }
  };

  if (!isOpen) return null;

  const selectedZone = deliveryZones.find((z) => z.id === selectedZoneId);
  const deliveryFee = selectedZone?.deliveryFee ?? restaurant?.defaultDeliveryFee ?? 300;
  const total = subtotal + deliveryFee;

  const validateInfoStep = (): boolean => {
    setError(null);

    if (!customerName.trim()) {
      setError('يرجى إدخال الاسم واللقب');
      return false;
    }

    if (!customerPhone.trim()) {
      setError('يرجى إدخال رقم الهاتف');
      return false;
    }

    if (!isValidAlgerianPhone(customerPhone)) {
      setError('يرجى إدخال رقم هاتف جزائري صحيح (مثال: 0550123456 أو 0661234567 أو 0770123456)');
      return false;
    }

    if (!selectedZoneId) {
      setError('يرجى اختيار منطقة التوصيل');
      return false;
    }

    if (!neighborhood.trim()) {
      setError('يرجى إدخال الحي أو المنطقة');
      return false;
    }

    if (!address.trim()) {
      setError('يرجى إدخال العنوان التفصيلي (الشارع، رقم العمارة، الطابق، رقم الباب)');
      return false;
    }

    if (selectedZone && subtotal < selectedZone.minOrderAmount) {
      setError(
        `الحد الأدنى للطلب لمنطقة "${selectedZone.commune}" هو ${formatDZD(selectedZone.minOrderAmount)}. مجموع وجباتك الحالي هو ${formatDZD(subtotal)}`
      );
      return false;
    }

    return true;
  };

  const handleNextToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateInfoStep()) {
      setStep('review');
    }
  };

  const handleFinalOrderSubmit = async () => {
    if (isSubmitting) return; // Prevent double click
    setIsSubmitting(true);
    setError(null);

    try {
      const orderPayload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        wilaya: wilaya.trim(),
        daira: daira.trim() || undefined,
        commune: commune.trim(),
        neighborhood: neighborhood.trim(),
        address: address.trim(),
        notes: notes.trim() || undefined,
        deliveryZoneId: selectedZoneId,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          notes: item.notes,
        })),
        paymentMethod: 'CASH_ON_DELIVERY' as const,
        idempotencyKey,
      };

      const createdOrder = await api.createOrder(orderPayload);
      clearCart();
      onOrderSuccess(createdOrder);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء الطلب، يرجى المحاولة مرة أخرى');
      setStep('info'); // return to review/info
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 text-white relative">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 transition-colors disabled:opacity-30"
            aria-label="إلغاء وإغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-stone-950 shadow-md">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                {step === 'info' ? 'معلومات التوصيل والزبون' : 'مراجعة وتأكيد الطلب'}
              </h3>
              <p className="text-xs text-stone-400">
                {step === 'info'
                  ? 'يرجى إدخال بيانات التوصيل بدقة لضمان وصول الوجبات ساخنة'
                  : 'راجع تفاصيل وجباتك وعنوان التوصيل قبل التأكيد النهائي'}
              </p>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-stone-800">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step === 'info' ? 'bg-amber-500 text-stone-950' : 'bg-emerald-500 text-white'
              }`}>
                {step === 'info' ? '1' : '✓'}
              </span>
              <span className={step === 'info' ? 'text-amber-400' : 'text-stone-300'}>
                معلومات التوصيل
              </span>
            </div>
            <div className="flex-1 h-0.5 bg-stone-800" />
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step === 'review' ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400'
              }`}>
                2
              </span>
              <span className={step === 'review' ? 'text-amber-400' : 'text-stone-500'}>
                مراجعة وتأكيد الطلب
              </span>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="m-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {/* STEP 1: CUSTOMER & DELIVERY INFO FORM */}
        {step === 'info' && (
          <form onSubmit={handleNextToReview} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Customer Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-600" />
                  <span>الاسم واللقب *</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="مثال: كريم بن علي"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-600" />
                  <span>رقم الهاتف الجزائري *</span>
                </label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0550123456 / 0661..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Delivery Zone Selector */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span>بلدية ومنطقة التوصيل *</span>
              </label>
              {loadingZones ? (
                <div className="h-10 bg-stone-100 rounded-xl animate-pulse" />
              ) : (
                <select
                  value={selectedZoneId}
                  onChange={(e) => handleZoneChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-amber-500 focus:bg-white font-medium"
                >
                  {deliveryZones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.commune} ({z.wilaya}) — سعر التوصيل: {formatDZD(z.deliveryFee)} (~{z.estimatedMinutes} دقيقة)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Wilaya & Daira */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">الولاية *</label>
                <input
                  type="text"
                  required
                  value={wilaya}
                  onChange={(e) => setWilaya(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">الدائرة (اختياري)</label>
                <input
                  type="text"
                  value={daira}
                  onChange={(e) => setDaira(e.target.value)}
                  placeholder="مثال: سيدي امحمد، باب الواد..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Neighborhood & Address */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">الحي / المنطقة *</label>
              <input
                type="text"
                required
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="مثال: حي 500 مسكن، حي الشهداء، قرب البريد المركزي..."
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">العنوان التفصيلي *</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="اسم الشارع، رقم العمارة، الطابق، رقم الشقة أو الباب..."
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-amber-500 focus:bg-white"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">ملاحظات التوصيل (اختياري)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: اتصل بي عند الوصول، الباب الخارجي لونه أبيض..."
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-amber-500 focus:bg-white"
              />
            </div>

            {/* Payment Method Badge */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs flex items-center justify-between text-amber-950 font-semibold">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-amber-700" />
                <span>طريقة الدفع: الدفع عند الاستلام (نقداً)</span>
              </div>
              <span className="text-[11px] font-mono bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-md">
                CASH_ON_DELIVERY
              </span>
            </div>

            {/* Buttons */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50"
              >
                العودة للسلة
              </button>

              <button
                type="submit"
                className="flex-1 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                <span>متابعة مراجعة الطلب</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: ORDER REVIEW BEFORE CONFIRMATION */}
        {step === 'review' && (
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Meals Summary */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <h4 className="text-xs font-bold text-stone-500 flex items-center justify-between">
                <span>الوجبات المطلوبة ({items.reduce((s, i) => s + i.quantity, 0)})</span>
                <button
                  onClick={() => setStep('info')}
                  className="text-amber-600 hover:underline text-[11px]"
                >
                  تعديل
                </button>
              </h4>

              <div className="divide-y divide-stone-200/60">
                {items.map(({ product, quantity, notes: itemNotes }) => (
                  <div key={product.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-stone-900">
                        {product.name} × {quantity}
                      </span>
                      {itemNotes && (
                        <p className="text-[11px] text-stone-400 italic">ملاحظة: {itemNotes}</p>
                      )}
                    </div>
                    <span className="font-black text-stone-900">
                      {formatDZD(product.price * quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Info Preview */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
              <h4 className="font-bold text-stone-500 flex items-center justify-between">
                <span>معلومات التوصيل والزبون</span>
                <button
                  onClick={() => setStep('info')}
                  className="text-amber-600 hover:underline text-[11px]"
                >
                  تعديل البيانات
                </button>
              </h4>

              <div className="grid grid-cols-2 gap-2 text-stone-700 pt-1">
                <div>
                  <span className="text-stone-400 block text-[11px]">الاسم:</span>
                  <span className="font-bold">{customerName}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">الهاتف:</span>
                  <span className="font-mono font-bold" dir="ltr">{customerPhone}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-stone-400 block text-[11px]">منطقة التوصيل والعنوان:</span>
                  <span className="font-medium">
                    {commune}، {wilaya} — {neighborhood}، {address}
                  </span>
                </div>
                {notes && (
                  <div className="col-span-2">
                    <span className="text-stone-400 block text-[11px]">ملاحظات:</span>
                    <span className="italic">{notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2 text-xs">
              <div className="flex justify-between text-stone-700">
                <span>مجموع الوجبات:</span>
                <span className="font-bold">{formatDZD(subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>سعر التوصيل ({commune}):</span>
                <span className="font-bold">{formatDZD(deliveryFee)}</span>
              </div>
              <div className="pt-2 border-t border-amber-200 flex justify-between text-base font-black text-stone-950">
                <span>المجموع النهائي للدفع:</span>
                <span className="text-amber-700 font-black">{formatDZD(total)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-amber-900 font-semibold pt-1">
                <Banknote className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>طريقة الدفع: الدفع عند الاستلام نقداً بالدينار الجزائري</span>
              </div>
            </div>

            {/* Confirmation & Submission Controls */}
            <div className="pt-3 border-t border-stone-200 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep('info')}
                className="px-4 py-3 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50 flex items-center gap-1.5 disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" />
                <span>رجوع للتعديل</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalOrderSubmit}
                className="flex-1 py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-400 text-white text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>جاري تسجيل وتأكيد الطلب...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <span>تأكيد الطلب الآن • {formatDZD(total)}</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

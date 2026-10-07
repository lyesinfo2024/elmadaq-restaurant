import { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatDZD, formatAlgerianDateTime, formatAlgerianPhone } from '../utils/formatters.ts';
import {
  X,
  Search,
  CheckCircle2,
  Clock,
  ChefHat,
  PackageCheck,
  Truck,
  Check,
  XCircle,
  MapPin,
  Phone,
  Banknote,
  RotateCw,
} from 'lucide-react';

interface OrderTrackerModalProps {
  initialOrder: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_STEPS: { key: OrderStatus; label: string; desc: string; icon: typeof Check }[] = [
  { key: 'NEW', label: 'تم استلام الطلب', desc: 'وصل الطلب لمطبخ المطعم', icon: Clock },
  { key: 'CONFIRMED', label: 'تم تأكيد الطلب', desc: 'تأكيد الوجبات وتجهيز المكونات', icon: CheckCircle2 },
  { key: 'PREPARING', label: 'قيد التحضير', desc: 'يقوم الطهاة بشواء وتحضير وجباتك', icon: ChefHat },
  { key: 'READY', label: 'الطلب جاهز', desc: 'تم تغليف الوجبات بعناية فائقة', icon: PackageCheck },
  { key: 'OUT_FOR_DELIVERY', label: 'خرج للتوصيل', desc: 'مع عامل التوصيل في الطريق لمنزلك', icon: Truck },
  { key: 'DELIVERED', label: 'تم التوصيل بنجاح', desc: 'بالصحة والعافية، نهارك سعيد', icon: Check },
];

export function OrderTrackerModal({ initialOrder, isOpen, onClose }: OrderTrackerModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(initialOrder);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialOrder) {
      setCurrentOrder(initialOrder);
      setSearchInput(initialOrder.orderNumber);
      setError(null);
    }
  }, [initialOrder, isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchInput.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const found = await api.trackOrder(searchInput.trim());
      setCurrentOrder(found);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'الطلب غير موجود');
      setCurrentOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (stepKey: OrderStatus) => {
    if (!currentOrder) return 'pending';
    if (currentOrder.status === 'CANCELLED') return 'cancelled';

    const orderStatusOrder: OrderStatus[] = [
      'NEW',
      'CONFIRMED',
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ];

    const currentIndex = orderStatusOrder.indexOf(currentOrder.status);
    const stepIndex = orderStatusOrder.indexOf(stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-stone-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <h3 className="text-xl font-black text-white mb-1">
            متابعة حالة الطلب 🇩🇿
          </h3>
          <p className="text-xs text-stone-400">
            أدخل رقم طلبك لتتبع خط سير تحضيره وتوصيله لحظة بلحظة
          </p>

          {/* Search bar inside tracker */}
          <form onSubmit={handleSearch} className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="أدخل رقم الطلب (مثال: #1001 أو #1002)..."
                className="w-full pl-3 pr-9 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-hidden focus:border-amber-500 font-mono"
              />
              <Search className="w-4 h-4 text-stone-400 absolute top-3 right-3 pointer-events-none" />
            </div>
            <button
              type="submit"
              disabled={loading || !searchInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-700 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <span>بحث</span>}
            </button>
          </form>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs text-center font-bold">
              {error}
            </div>
          )}

          {currentOrder && (
            <>
              {/* Order Meta Bar */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-stone-400 block text-[11px]">رقم الطلب:</span>
                  <span className="font-mono font-black text-base text-amber-600">
                    {currentOrder.orderNumber}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">تاريخ ووقت الطلب:</span>
                  <span className="font-medium text-stone-700">
                    {formatAlgerianDateTime(currentOrder.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">المجموع الإجمالي:</span>
                  <span className="font-black text-sm text-stone-900">
                    {formatDZD(currentOrder.total)}
                  </span>
                </div>
              </div>

              {/* Status Timeline */}
              {currentOrder.status === 'CANCELLED' ? (
                <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-2">
                  <XCircle className="w-10 h-10 text-red-600 mx-auto" />
                  <h4 className="font-black text-red-900 text-base">تم إلغاء هذا الطلب</h4>
                  <p className="text-xs text-red-700">
                    تم إلغاء الطلب من قِبل إدارة المطعم. يرجى التواصل مع المطعم لمزيد من المعلومات.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <h4 className="text-xs font-bold text-stone-600">خطوات تجهيز وتوصيل الوجبة:</h4>
                  <div className="relative pl-6 space-y-5 border-r-2 border-stone-200 mr-3">
                    {STATUS_STEPS.map((step) => {
                      const state = getStepStatus(step.key);
                      const Icon = step.icon;

                      return (
                        <div key={step.key} className="relative flex items-start gap-3.5 group">
                          {/* Dot/Icon indicator on line */}
                          <div
                            className={`absolute -right-[1.45rem] top-0.5 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                              state === 'completed'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : state === 'current'
                                ? 'bg-amber-500 text-stone-950 ring-4 ring-amber-200 animate-pulse'
                                : 'bg-stone-200 text-stone-400'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>

                          <div className="mr-5">
                            <div className="flex items-center gap-2">
                              <h5
                                className={`text-xs sm:text-sm font-bold ${
                                  state === 'completed'
                                    ? 'text-emerald-700'
                                    : state === 'current'
                                    ? 'text-amber-600 font-black'
                                    : 'text-stone-400'
                                }`}
                              >
                                {step.label}
                              </h5>
                              {state === 'current' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                                  الحالة الحالية
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5">{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Delivery Driver Info Card (Phase 3) */}
              {currentOrder.deliveryPerson && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-xs">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-800 font-bold block">
                          {currentOrder.status === 'OUT_FOR_DELIVERY'
                            ? '🛵 كابتن التوصيل في الطريق إليك الآن'
                            : 'كابتن التوصيل المكلف بالطلب'}
                        </span>
                        <h4 className="font-black text-sm text-stone-900">
                          {currentOrder.deliveryPerson.name}
                        </h4>
                      </div>
                    </div>

                    <a
                      href={`tel:${currentOrder.deliveryPerson.phone}`}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
                    >
                      <Phone className="w-3.5 h-3.5 fill-white" />
                      <span>اتصال بالكابتن</span>
                    </a>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-600 pt-2 border-t border-amber-200/60">
                    <span>
                      رقم هاتف المندوب:{' '}
                      <strong className="font-mono text-stone-900" dir="ltr">
                        {formatAlgerianPhone(currentOrder.deliveryPerson.phone)}
                      </strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Items List Details */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
                <h4 className="font-bold text-stone-600">الوجبات في هذا الطلب:</h4>
                <div className="divide-y divide-stone-200/60">
                  {currentOrder.items.map((item) => (
                    <div key={item.id} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-stone-800">
                          {item.productName} × {item.quantity}
                        </span>
                        {item.notes && (
                          <p className="text-[11px] text-stone-400 italic">ملاحظة: {item.notes}</p>
                        )}
                      </div>
                      <span className="font-black text-stone-900">{formatDZD(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-stone-200 flex justify-between font-black text-sm text-stone-900">
                  <span>المجموع الإجمالي مع التوصيل:</span>
                  <span className="text-amber-600">{formatDZD(currentOrder.total)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

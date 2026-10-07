import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Order, OrderStatus } from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatDZD, formatAlgerianPhone, formatAlgerianDateTime } from '../utils/formatters.ts';
import {
  Phone,
  MapPin,
  Clock,
  LogOut,
  RefreshCw,
  AlertCircle,
  Banknote,
  X,
  Package,
  Bike,
  CheckCircle2,
  XCircle,
  FileText,
} from 'lucide-react';

interface DeliveryDashboardProps {
  onClose: () => void;
}

export function DeliveryDashboard({ onClose }: DeliveryDashboardProps) {
  const { user, token, logout } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status updating state
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Simple Cancellation Modal
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('الزبون لا يرد على الهاتف');

  // Success message toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadOrders = async (isManual = false) => {
    if (!token) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await api.getDeliveryOrders(token);
      setOrders(data);
    } catch (err: unknown) {
      console.error('Failed to load assigned orders:', err);
      setError(err instanceof Error ? err.message : 'فشل في تحميل قائمة الطلبات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [token]);

  // Handle status update by the driver
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, reason?: string) => {
    if (!token) return;
    setUpdatingOrderId(orderId);
    try {
      const updated = await api.updateDeliveryDriverOrderStatus(orderId, newStatus, reason, token);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));

      if (newStatus === 'OUT_FOR_DELIVERY') {
        showToast(`الطلب ${updated.orderNumber} في الطريق للتوصيل 🛵`);
      } else if (newStatus === 'DELIVERED') {
        showToast(`تم تأكيد التوصيل واستلام المبلغ بنجاح ✅`);
      } else if (newStatus === 'CANCELLED') {
        showToast(`تم تسجيل تعذر التوصيل للطلب ${updated.orderNumber}`);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'فشل في تحديث حالة الطلب');
    } finally {
      setUpdatingOrderId(null);
      setCancelModalOrder(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900 text-stone-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-60 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header - Simple & Clean for Mobile */}
      <header className="sticky top-0 z-40 bg-stone-950/95 backdrop-blur-md border-b border-stone-800 px-4 py-3 sm:px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-sm">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-white leading-tight">طلباتي</h1>
              <p className="text-xs text-stone-400">
                المندوب: <span className="text-amber-400 font-bold">{user?.name || 'كابتن التوصيل'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              onClick={() => loadOrders(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 transition-colors border border-stone-700/60"
              title="تحديث الطلبات"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            {/* Logout */}
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-xs font-bold transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Orders List Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadOrders(true)}
              className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-stone-850 rounded-2xl p-5 border border-stone-800 animate-pulse space-y-3"
              >
                <div className="h-5 bg-stone-750 rounded-lg w-1/3" />
                <div className="h-4 bg-stone-750 rounded-lg w-1/2" />
                <div className="h-10 bg-stone-750 rounded-xl w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && orders.length === 0 && (
          <div className="text-center py-16 px-4 bg-stone-850/60 rounded-3xl border border-dashed border-stone-800 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-stone-800 text-stone-400 flex items-center justify-center mx-auto">
              <Package className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">لا توجد طلبات مسندة إليك حالياً</h3>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              عندما يقوم صاحب المطعم بإسناد طلب جديد إليك، سيظهر هنا مباشرة مع كافة معلومات الزبون والعنوان.
            </p>
            <button
              onClick={() => loadOrders(true)}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-bold border border-stone-700 transition-colors"
            >
              تحديث القائمة
            </button>
          </div>
        )}

        {/* Orders list */}
        {!loading && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => {
              const isUpdating = updatingOrderId === order.id;

              return (
                <div
                  key={order.id}
                  className={`bg-stone-850 rounded-2xl border transition-all shadow-md overflow-hidden ${
                    order.status === 'OUT_FOR_DELIVERY'
                      ? 'border-orange-500/60 ring-1 ring-orange-500/40'
                      : order.status === 'DELIVERED'
                      ? 'border-emerald-700/50'
                      : order.status === 'CANCELLED'
                      ? 'border-red-900/50 opacity-80'
                      : 'border-stone-800'
                  }`}
                >
                  {/* Top Bar: Order Number & Status */}
                  <div className="p-4 bg-stone-900/70 border-b border-stone-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-lg text-amber-400">
                        {order.orderNumber}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          order.status === 'OUT_FOR_DELIVERY'
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                            : order.status === 'READY'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                            : order.status === 'DELIVERED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : order.status === 'CANCELLED'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : 'bg-stone-700 text-stone-300'
                        }`}
                      >
                        {order.status === 'OUT_FOR_DELIVERY'
                          ? '🛵 خرجت للتوصيل'
                          : order.status === 'READY'
                          ? '📦 جاهز للتوصيل'
                          : order.status === 'DELIVERED'
                          ? '✅ تم التوصيل'
                          : order.status === 'CANCELLED'
                          ? '❌ ملغي (تعذر التوصيل)'
                          : order.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-400 font-mono">
                      {formatAlgerianDateTime(order.createdAt)}
                    </div>
                  </div>

                  {/* Order Details Body */}
                  <div className="p-4 space-y-3.5 text-xs">
                    {/* Customer Info with Call Button */}
                    <div className="p-3 bg-stone-900 rounded-xl border border-stone-800 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-stone-400 block">اسم الزبون:</span>
                        <h4 className="font-black text-sm text-white">{order.customerName}</h4>
                        <span className="text-xs text-stone-300 font-mono" dir="ltr">
                          {formatAlgerianPhone(order.customerPhone)}
                        </span>
                      </div>

                      {/* Call Customer Button */}
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                      >
                        <Phone className="w-3.5 h-3.5 fill-white" />
                        <span>اتصال</span>
                      </a>
                    </div>

                    {/* Address & Commune */}
                    <div className="p-3 bg-stone-900/60 rounded-xl border border-stone-800 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-bold text-white">
                            البلدية: <span className="text-amber-400">{order.commune}</span> ({order.wilaya})
                          </p>
                          <p className="text-stone-300">
                            الحي: <span className="text-white">{order.neighborhood}</span>
                          </p>
                          <p className="text-stone-400 leading-relaxed">
                            العنوان: <span className="text-stone-200">{order.address}</span>
                          </p>
                        </div>
                      </div>

                      {/* Note */}
                      {order.notes && (
                        <div className="mt-2 pt-2 border-t border-stone-800 flex items-start gap-1.5 text-amber-300 bg-amber-950/20 p-2 rounded-lg">
                          <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-amber-400">الملاحظة: </span>
                            {order.notes}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Meals & Quantities */}
                    <div className="p-3 bg-stone-900/80 rounded-xl border border-stone-800 space-y-2">
                      <div className="font-bold text-stone-400 text-[11px]">الوجبات والكمية:</div>
                      <div className="divide-y divide-stone-800">
                        {order.items.map((item) => (
                          <div key={item.id} className="py-1.5 first:pt-0 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-white text-xs">{item.productName}</span>
                              <span className="text-amber-400 font-bold mr-2">× {item.quantity}</span>
                              {item.notes && (
                                <p className="text-[10px] text-stone-400 italic">ملاحظة: {item.notes}</p>
                              )}
                            </div>
                            <span className="font-mono text-stone-300">{formatDZD(item.totalPrice)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total Amount to Collect */}
                    <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-emerald-400" />
                        <div>
                          <span className="text-[10px] text-emerald-300 block font-bold">
                            المبلغ الإجمالي (الدفع عند الاستلام نقداً):
                          </span>
                          <span className="font-mono font-black text-lg text-emerald-300">
                            {formatDZD(order.total)}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] px-2 py-1 bg-emerald-900/60 text-emerald-200 rounded-lg font-bold border border-emerald-700/60">
                        {order.paymentStatus === 'PAID' ? 'تم استلام المبلغ' : 'الدفع عند الاستلام'}
                      </span>
                    </div>

                    {/* Cancellation reason if cancelled */}
                    {order.status === 'CANCELLED' && order.cancellationReason && (
                      <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl text-xs text-red-300">
                        <span className="font-bold text-red-200">سبب تعذر التوصيل: </span>
                        {order.cancellationReason}
                      </div>
                    )}

                    {/* Driver Action Buttons */}
                    {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                      <div className="pt-2 border-t border-stone-800 flex flex-col sm:flex-row gap-2">
                        {/* 1. When READY or PREPARING: Out for delivery */}
                        {order.status !== 'OUT_FOR_DELIVERY' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'OUT_FOR_DELIVERY')}
                            disabled={isUpdating}
                            className="flex-1 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:bg-stone-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                          >
                            <Bike className="w-4 h-4" />
                            <span>خرجت للتوصيل 🛵</span>
                          </button>
                        )}

                        {/* 2. When OUT_FOR_DELIVERY: Arrived & Delivered */}
                        {order.status === 'OUT_FOR_DELIVERY' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                            disabled={isUpdating}
                            className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>تم التوصيل ✅</span>
                          </button>
                        )}

                        {/* 3. Unable to deliver (with simple reason) */}
                        <button
                          onClick={() => {
                            setCancelModalOrder(order);
                            setCancelReason('الزبون لا يرد على الهاتف');
                          }}
                          disabled={isUpdating}
                          className="py-3 px-4 rounded-xl bg-stone-800 hover:bg-red-950/50 hover:text-red-300 text-stone-300 border border-stone-700 text-xs font-bold transition-all"
                        >
                          تعذر التوصيل ❌
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Simple Cancellation Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-60 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span>تعذر توصيل الطلب {cancelModalOrder.orderNumber}</span>
              </h3>
              <button
                onClick={() => setCancelModalOrder(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1.5">
                سبب تعذر التوصيل:
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="اكتب سبب بسيط (مثال: الزبون لا يرد على الهاتف)..."
                className="w-full p-3 bg-stone-850 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  const finalReason = cancelReason.trim() || 'الزبون لم يستلم الطلب';
                  handleUpdateStatus(cancelModalOrder.id, 'CANCELLED', finalReason);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors shadow-md"
              >
                تأكيد الإلغاء
              </button>
              <button
                onClick={() => setCancelModalOrder(null)}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-bold"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

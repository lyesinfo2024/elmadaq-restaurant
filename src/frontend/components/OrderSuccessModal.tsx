import { Order } from '../types/index.ts';
import { formatDZD } from '../utils/formatters.ts';
import { CheckCircle2, ShoppingBag, Eye, ArrowRight, Banknote, MapPin, Phone } from 'lucide-react';

interface OrderSuccessModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onTrackOrder: (order: Order) => void;
}

export function OrderSuccessModal({ order, isOpen, onClose, onTrackOrder }: OrderSuccessModalProps) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-200 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success Header Banner */}
        <div className="p-8 bg-gradient-to-br from-emerald-800 to-emerald-950 text-white relative">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 ring-4 ring-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full bg-emerald-700/60 text-emerald-200 text-xs font-bold mb-2">
            تم تسجيل الطلب في النظام بنجاح
          </span>

          <h3 className="text-2xl font-black text-white">
            تم استلام طلبك بنجاح!
          </h3>
          <p className="text-xs text-emerald-200 mt-1">
            سيبدأ طهاة المطعم بتحضير وجباتك الطازجة فوراً
          </p>
        </div>

        {/* Order Details Summary Box */}
        <div className="p-6 space-y-4">
          <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 text-right space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <span className="text-xs font-bold text-stone-500">رقم الطلب المرجعي:</span>
              <span className="text-lg font-black text-amber-600 font-mono tracking-wider">
                {order.orderNumber}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-stone-700">
              <span>المبلغ الإجمالي المستحق:</span>
              <span className="font-black text-base text-stone-900">{formatDZD(order.total)}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-stone-700">
              <span>طريقة الدفع:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>الدفع عند الاستلام (نقداً)</span>
              </span>
            </div>

            <div className="flex items-start justify-between text-xs text-stone-700 pt-2 border-t border-stone-200">
              <span className="text-stone-500">عنوان التوصيل:</span>
              <span className="font-medium text-stone-900 text-left max-w-xs">
                {order.commune}، {order.wilaya} ({order.neighborhood})
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => {
                onTrackOrder(order);
                onClose();
              }}
              className="w-full py-3.5 px-6 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>متابعة حالة الطلب ({order.orderNumber})</span>
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 px-6 rounded-2xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4 text-stone-500" />
              <span>العودة إلى قائمة الوجبات</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

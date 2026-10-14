import { useNotification, AppNotification } from '../context/NotificationContext.tsx';
import { formatDZD } from '../utils/formatters.ts';
import { Bell, CheckCircle2, AlertCircle, X, ChevronLeft, Volume2, VolumeX, Sparkles } from 'lucide-react';

interface NotificationToastProps {
  onSelectOrder?: (orderId: string, orderNumber: string) => void;
}

export function NotificationToast({ onSelectOrder }: NotificationToastProps) {
  const { activeToast, dismissToast, isMuted, toggleMute } = useNotification();

  if (!activeToast) return null;

  const isNew = activeToast.type === 'NEW_ORDER';
  const isConfirmed = activeToast.type === 'ORDER_CONFIRMED';

  const handleClick = () => {
    if (onSelectOrder) {
      onSelectOrder(activeToast.orderId, activeToast.orderNumber);
    }
    dismissToast();
  };

  return (
    <div
      dir="rtl"
      className="fixed bottom-5 left-5 z-70 max-w-md w-[calc(100vw-2.5rem)] sm:w-96 bg-stone-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-stone-700/80 p-4 transition-all animate-in slide-in-from-bottom-5 fade-in duration-300"
      role="alert"
    >
      <div className="flex items-start gap-3.5">
        {/* Icon with pulsing animation */}
        <div
          className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold shadow-md ${
            isNew
              ? 'bg-amber-500 text-stone-950 animate-bounce'
              : isConfirmed
              ? 'bg-emerald-500 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          {isNew ? (
            <Bell className="w-6 h-6" />
          ) : isConfirmed ? (
            <CheckCircle2 className="w-6 h-6" />
          ) : (
            <AlertCircle className="w-6 h-6" />
          )}
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-md ${
                isNew
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : isConfirmed
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}
            >
              {isNew ? 'طلب جديد وارد 🔔' : isConfirmed ? 'تم تأكيد الطلب ✅' : 'تحديث الطلب ℹ️'}
            </span>
            <span className="text-[10px] text-stone-400 font-mono">الآن</span>
          </div>

          <h4 className="text-sm font-black text-white mt-1 leading-snug line-clamp-1">
            {activeToast.title}
          </h4>

          {isNew && (
            <div className="mt-1 text-xs text-stone-300 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">الزبون:</span>
                <span className="font-bold text-white">{activeToast.customerName || 'زبون المطعم'}</span>
              </div>
              {activeToast.total !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">الإجمالي:</span>
                  <span className="font-extrabold text-amber-400">{formatDZD(activeToast.total)}</span>
                </div>
              )}
            </div>
          )}

          {!isNew && (
            <p className="text-xs text-stone-300 mt-1 line-clamp-2 leading-relaxed">
              {activeToast.message}
            </p>
          )}

          {/* Action buttons */}
          <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-stone-800">
            <button
              onClick={handleClick}
              className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
            >
              <span>عرض تفاصيل الطلب</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="p-1 rounded-md text-stone-400 hover:text-white transition-colors"
                title={isMuted ? 'تفعيل الصوت' : 'كتم الصوت'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={dismissToast}
                className="p-1 rounded-md text-stone-400 hover:text-white transition-colors"
                title="إغلاق التنبيه"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

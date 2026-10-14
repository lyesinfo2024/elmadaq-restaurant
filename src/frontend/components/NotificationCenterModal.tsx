import { useState } from 'react';
import { useNotification, AppNotification } from '../context/NotificationContext.tsx';
import { formatDZD } from '../utils/formatters.ts';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  X,
  Volume2,
  VolumeX,
  Play,
  Trash2,
  CheckCheck,
  ChevronLeft,
  Clock,
  Sparkles,
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder?: (orderId: string, orderNumber: string) => void;
}

export function NotificationCenterModal({ isOpen, onClose, onSelectOrder }: NotificationCenterModalProps) {
  const {
    notifications,
    unreadCount,
    newOrdersUnviewedCount,
    isMuted,
    toggleMute,
    playTestSound,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    resetNewOrdersBadge,
  } = useNotification();

  const [activeTab, setActiveTab] = useState<'all' | 'new_orders'>('all');

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'new_orders') return n.type === 'NEW_ORDER';
    return true;
  });

  const handleSelect = (notif: AppNotification) => {
    markAsRead(notif.id);
    if (onSelectOrder) {
      onSelectOrder(notif.orderId, notif.orderNumber);
    }
    onClose();
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return new Intl.DateTimeFormat('ar-DZ', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(d);
    } catch {
      return '';
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-60 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-md">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">مركز الإشعارات والتنبيهات</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-red-600 text-white">
                    {unreadCount} غير مقروء
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">تنبيهات فورية صوتية ومرئية بالطلبات وحالاتها</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <button
              onClick={toggleMute}
              className={`p-2 rounded-xl border transition-colors ${
                isMuted
                  ? 'bg-red-950/60 text-red-300 border-red-800 hover:bg-red-900'
                  : 'bg-stone-800 text-amber-400 border-stone-700 hover:bg-stone-750'
              }`}
              title={isMuted ? 'الصوت معطل - اضغط للتشغيل' : 'الصوت مفعل - اضغط للكتم'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Audio Test Bar */}
        <div className="bg-stone-100 border-b border-stone-200 px-5 py-2.5 flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-2 text-stone-600">
            <span>تجربة النغمات الصوتية:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => playTestSound('NEW_ORDER')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold transition-all shadow-xs active:scale-95"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>نغمة طلبية جديدة 🔔</span>
            </button>
            <button
              onClick={() => playTestSound('ORDER_CONFIRMED')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs active:scale-95"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>نغمة تأكيد الطلبية ✅</span>
            </button>
          </div>
        </div>

        {/* Action Controls & Tabs */}
        <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              جميع التنبيهات ({notifications.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('new_orders');
                resetNewOrdersBadge();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'new_orders'
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
              }`}
            >
              <span>الطلبيات الجديدة</span>
              {newOrdersUnviewedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-stone-600 hover:text-stone-900 font-semibold"
              >
                <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>تحديد الكل كمقروء</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold mr-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح السجل</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <Bell className="w-12 h-12 mx-auto stroke-1 text-stone-300 mb-2" />
              <p className="text-sm font-bold text-stone-600">لا توجد تنبيهات حالياً</p>
              <p className="text-xs text-stone-400 mt-1">ستصلك التنبيهات فور تسجيل أي طلبية جديدة أو تغيير حالتها</p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isNew = notif.type === 'NEW_ORDER';
              const isConfirmed = notif.type === 'ORDER_CONFIRMED';

              return (
                <div
                  key={notif.id}
                  onClick={() => handleSelect(notif)}
                  className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    !notif.read
                      ? isNew
                        ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                        : 'bg-blue-50/80 border-blue-200'
                      : 'bg-white hover:bg-stone-50 border-stone-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center font-bold ${
                        isNew
                          ? 'bg-amber-500 text-stone-950'
                          : isConfirmed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {isNew ? (
                        <Bell className="w-4 h-4" />
                      ) : isConfirmed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-stone-900">{notif.title}</span>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-red-600 shrink-0"></span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-stone-400 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(notif.timestamp)}</span>
                        </div>
                      </div>

                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                        {notif.message}
                      </p>

                      {isNew && notif.total !== undefined && (
                        <div className="mt-2 flex items-center justify-between text-xs pt-1.5 border-t border-amber-200/60 font-semibold">
                          <span className="text-stone-500">الزبون: {notif.customerName}</span>
                          <span className="text-amber-700 font-bold">{formatDZD(notif.total)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(notif.id);
                        }}
                        className="p-1 rounded-lg text-stone-400 hover:text-red-600 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-stone-50 p-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <span>النظام متصل بالخادم وتصل التنبيهات آنياً ⚡</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

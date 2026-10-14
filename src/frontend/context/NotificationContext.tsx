import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Order } from '../types/index.ts';
import { soundPlayer } from '../utils/soundEffects.ts';

export interface AppNotification {
  id: string;
  orderId: string;
  orderNumber: string;
  type: 'NEW_ORDER' | 'ORDER_CONFIRMED' | 'STATUS_CHANGED';
  title: string;
  message: string;
  customerName?: string;
  total?: number;
  status?: string;
  timestamp: string;
  read: boolean;
  order?: Order;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  newOrdersUnviewedCount: number; // Counter for new orders not yet inspected by admin
  isMuted: boolean;
  toggleMute: () => void;
  playTestSound: (type: 'NEW_ORDER' | 'ORDER_CONFIRMED') => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  resetNewOrdersBadge: () => void;
  activeToast: AppNotification | null;
  dismissToast: () => void;
  onNavigateToOrder?: (orderId: string, orderNumber: string) => void;
  setNavigateHandler: (handler: (orderId: string, orderNumber: string) => void) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const SEEN_EVENTS_STORAGE_KEY = 'restaurant_seen_order_events';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('restaurant_notifications_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isMuted, setIsMuted] = useState<boolean>(() => soundPlayer.getIsMuted());
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigateHandlerRef = useRef<((orderId: string, orderNumber: string) => void) | null>(null);

  // Set of seen event keys to strictly avoid duplicate alerts across refreshes / reconnects
  const seenEventsRef = useRef<Set<string>>(new Set());

  // Load seen events from sessionStorage / localStorage
  useEffect(() => {
    try {
      const savedKeys = sessionStorage.getItem(SEEN_EVENTS_STORAGE_KEY);
      if (savedKeys) {
        const arr = JSON.parse(savedKeys) as string[];
        arr.forEach((k) => seenEventsRef.current.add(k));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('restaurant_notifications_list', JSON.stringify(notifications.slice(0, 50)));
    } catch {
      // ignore
    }
  }, [notifications]);

  // Request browser notification permission once user interacts
  useEffect(() => {
    const handleFirstGesture = () => {
      soundPlayer.unlockAudio();
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
    window.addEventListener('click', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });
    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  const showSystemNotification = useCallback((title: string, body: string, orderNumber: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: `order-${orderNumber}`,
        });
        n.onclick = () => {
          window.focus();
          if (navigateHandlerRef.current) {
            navigateHandlerRef.current('', orderNumber);
          }
        };
      } catch {
        // ignore
      }
    }
  }, []);

  // Dispatch toast with auto-hide after 7 seconds
  const triggerToast = useCallback((notif: AppNotification) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setActiveToast(notif);
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 7000);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setActiveToast(null);
  }, []);

  // Handler for Incoming SSE Events
  const handleRealtimeEvent = useCallback(
    (eventPayload: { type: string; timestamp: string; order: Order; previousStatus?: string }) => {
      const { type, order, previousStatus } = eventPayload;
      if (!order || !order.id) return;

      const eventKey = `${type}_${order.id}_${order.status}_${order.updatedAt || order.createdAt}`;

      // Deduplication guard
      if (seenEventsRef.current.has(eventKey)) {
        return;
      }
      seenEventsRef.current.add(eventKey);
      try {
        const arr = Array.from(seenEventsRef.current).slice(-200);
        sessionStorage.setItem(SEEN_EVENTS_STORAGE_KEY, JSON.stringify(arr));
      } catch {
        // ignore
      }

      if (type === 'order:created' || (order.status === 'NEW' && !previousStatus)) {
        // 1. NEW ORDER ARRIVED
        const notif: AppNotification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          type: 'NEW_ORDER',
          title: `طلب جديد وارد: ${order.orderNumber}`,
          message: `وصل طلب جديد باسم ${order.customerName} بمبلغ إجمالي ${Math.round(order.total).toLocaleString('fr-DZ')} دج`,
          customerName: order.customerName,
          total: order.total,
          status: 'NEW',
          timestamp: new Date().toISOString(),
          read: false,
          order,
        };

        // Play Distinct New Order Sound
        soundPlayer.playNewOrderSound();

        // System notification
        showSystemNotification(
          `🔔 طلب جديد وارد: ${order.orderNumber}`,
          `الزبون: ${order.customerName} - المبلغ: ${Math.round(order.total).toLocaleString('fr-DZ')} دج`,
          order.orderNumber
        );

        // UI Toast & State
        triggerToast(notif);
        setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
      } else if (type === 'order:status_updated' && order.status === 'CONFIRMED' && previousStatus !== 'CONFIRMED') {
        // 2. ORDER CONFIRMED
        const notif: AppNotification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          type: 'ORDER_CONFIRMED',
          title: `تم تأكيد الطلب: ${order.orderNumber}`,
          message: `تم تأكيد الطلب ${order.orderNumber} وبدأ تجهيزه بالمطبخ`,
          customerName: order.customerName,
          total: order.total,
          status: 'CONFIRMED',
          timestamp: new Date().toISOString(),
          read: false,
          order,
        };

        // Play Distinct Order Confirmed Sound
        soundPlayer.playOrderConfirmedSound();

        // System notification
        showSystemNotification(
          `✅ تم تأكيد الطلب: ${order.orderNumber}`,
          `تم قبول الطلب وتحويله لمرحلة التحضير بالمطبخ`,
          order.orderNumber
        );

        // UI Toast & State
        triggerToast(notif);
        setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
      } else if (type === 'order:status_updated' && order.status !== previousStatus) {
        // Other status changes (Ready, Out for delivery, Delivered)
        const statusArabic: Record<string, string> = {
          PREPARING: 'قيد التحضير في المطبخ',
          READY: 'جاهز للتوصيل',
          OUT_FOR_DELIVERY: 'خرج مع عامل التوصيل',
          DELIVERED: 'تم التوصيل بنجاح',
          CANCELLED: 'تم إلغاء الطلب',
        };

        const statusLabel = statusArabic[order.status] || order.status;

        const notif: AppNotification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          type: 'STATUS_CHANGED',
          title: `تحديث الطلب: ${order.orderNumber}`,
          message: `تغيرت حالة الطلب ${order.orderNumber} إلى «${statusLabel}»`,
          customerName: order.customerName,
          total: order.total,
          status: order.status,
          timestamp: new Date().toISOString(),
          read: false,
          order,
        };

        soundPlayer.playNotificationSound();
        triggerToast(notif);
        setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
      }
    },
    [showSystemNotification, triggerToast]
  );

  // Connect to SSE stream
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let isDisposed = false;

    const connectSSE = () => {
      if (isDisposed) return;
      try {
        eventSource = new EventSource('/api/orders/events/stream');

        eventSource.onopen = () => {
          // Connected successfully
        };

        eventSource.onmessage = (event) => {
          if (!event.data) return;
          try {
            const data = JSON.parse(event.data);
            handleRealtimeEvent(data);
          } catch {
            // Heartbeat or malformed JSON
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (!isDisposed) {
            // Reconnect after 3 seconds
            retryTimeout = setTimeout(connectSSE, 3000);
          }
        };
      } catch (err) {
        console.warn('[NotificationProvider] Failed to connect SSE:', err);
        if (!isDisposed) {
          retryTimeout = setTimeout(connectSSE, 5000);
        }
      }
    };

    connectSSE();

    return () => {
      isDisposed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (eventSource) eventSource.close();
    };
  }, [handleRealtimeEvent]);

  const toggleMute = useCallback(() => {
    const nextMuted = soundPlayer.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  const playTestSound = useCallback((type: 'NEW_ORDER' | 'ORDER_CONFIRMED') => {
    soundPlayer.unlockAudio();
    if (type === 'NEW_ORDER') {
      soundPlayer.playNewOrderSound();
    } else {
      soundPlayer.playOrderConfirmedSound();
    }
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const resetNewOrdersBadge = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => (n.type === 'NEW_ORDER' ? { ...n, read: true } : n))
    );
  }, []);

  const setNavigateHandler = useCallback((handler: (orderId: string, orderNumber: string) => void) => {
    navigateHandlerRef.current = handler;
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const newOrdersUnviewedCount = notifications.filter((n) => n.type === 'NEW_ORDER' && !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
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
        activeToast,
        dismissToast,
        onNavigateToOrder: (orderId, orderNumber) => {
          if (navigateHandlerRef.current) {
            navigateHandlerRef.current(orderId, orderNumber);
          }
        },
        setNavigateHandler,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

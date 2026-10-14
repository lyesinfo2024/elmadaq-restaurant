import { EventEmitter } from 'events';
import { Order } from '../types/index.ts';

export type OrderEventType = 'order:created' | 'order:status_updated' | 'order:assigned';

export interface OrderRealtimeEvent {
  type: OrderEventType;
  timestamp: string;
  order: Order;
  previousStatus?: string;
  updatedByRole?: string;
}

class OrderEventsHub extends EventEmitter {
  constructor() {
    super();
    // Allow multiple simultaneous SSE listeners without memory leak warning
    this.setMaxListeners(100);
  }

  notifyOrderCreated(order: Order) {
    const payload: OrderRealtimeEvent = {
      type: 'order:created',
      timestamp: new Date().toISOString(),
      order,
    };
    this.emit('order_event', payload);
  }

  notifyOrderStatusUpdated(order: Order, previousStatus?: string, updatedByRole?: string) {
    const payload: OrderRealtimeEvent = {
      type: 'order:status_updated',
      timestamp: new Date().toISOString(),
      order,
      previousStatus,
      updatedByRole,
    };
    this.emit('order_event', payload);
  }

  notifyOrderAssigned(order: Order) {
    const payload: OrderRealtimeEvent = {
      type: 'order:assigned',
      timestamp: new Date().toISOString(),
      order,
    };
    this.emit('order_event', payload);
  }
}

export const orderEventsHub = new OrderEventsHub();

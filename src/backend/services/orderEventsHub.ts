import { EventEmitter } from 'events';
import { Order } from '../types/index.ts';

export type OrderEventType = 'order:created';

export interface OrderRealtimeEvent {
  type: OrderEventType;
  timestamp: string;
  order: Order;
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
}

export const orderEventsHub = new OrderEventsHub();

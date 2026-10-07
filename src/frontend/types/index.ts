export type Role = 'ADMIN' | 'MANAGER' | 'DELIVERY' | 'CUSTOMER';

export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type OrderType = 'DELIVERY' | 'TAKEAWAY' | 'DINE_IN';

export type PaymentMethod = 'CASH_ON_DELIVERY' | 'BARIDIMOB' | 'EDAHABIA';
export type PaymentStatus = 'UNPAID' | 'PAID';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  phone: string;
  email?: string;
  
  wilaya: string;
  commune: string;
  address: string;
  
  currency: string;      // "دج"
  currencyCode: string;  // "DZD"
  isOpen: boolean;
  openingHours?: string;
  timezone: string;      // "Africa/Algiers"
  
  defaultDeliveryFee: number; // بالدينار الجزائري الصحيح
  minOrderAmount: number;     // بالدينار الجزائري
  defaultCourierFeePerOrder?: number; // أجرة التوصيل الافتراضية لكل طلب للمندوب (مثلاً: 100 دج)
  
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryZone {
  id: string;
  restaurantId: string;
  wilaya: string;
  wilayaCode?: string;
  commune: string;
  deliveryFee: number;       // سعر التوصيل بالدينار الجزائري
  estimatedMinutes: number;   // مدة التوصيل بالدقائق
  minOrderAmount: number;     // الحد الأدنى للطلب
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number; // عدد صحيح بالدينار الجزائري (مثال: 450, 1200)
  imageUrl: string;
  isAvailable: boolean;
  isFeatured: boolean;
  displayOrder: number;
  preparationTimeMinutes?: number;
  calories?: number;
  tags?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string;
  productName: string; // حفظ اسم الوجبة وقت الطلب
  unitPrice: number;   // حفظ سعر الوجبة بالدينار الجزائري وقت الطلب
  quantity: number;
  totalPrice: number;  // unitPrice * quantity
  notes?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string; // مثال: #1001
  restaurantId: string;
  customerId?: string;
  status: OrderStatus;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  
  subtotal: number;     // مجموع أسعار الوجبات المحسوبة من قاعدة البيانات
  deliveryFee: number;  // سعر التوصيل المأخوذ من DeliveryZone في قاعدة البيانات
  total: number;        // المجموع النهائي المستحق بالدينار (subtotal + deliveryFee)

  customerName: string; // الاسم واللقب
  customerPhone: string;// 05/06/07XXXXXXXX
  wilaya: string;
  daira?: string;
  commune: string;
  neighborhood: string;
  address: string;      // العنوان التفصيلي
  deliveryAddress?: string;
  notes?: string;

  deliveryPersonId?: string;
  deliveryPerson?: DeliveryPersonSummary;
  cancellationReason?: string;
  deliveredAt?: string;
  courierPaid?: boolean;
  courierPayoutId?: string;
  courierFeeAtDelivery?: number;
  items: OrderItem[];
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryPersonSummary {
  id: string;
  name: string;
  phone: string;
  vehicleType?: string;
  vehiclePlateNumber?: string;
  isAvailable?: boolean;
}

export interface DeliveryPerson {
  id: string;
  restaurantId: string;
  userId: string;
  name: string;
  phone: string;
  email?: string;
  isActive: boolean;
  isAvailable: boolean;
  deliveryFeePerOrder?: number;
  vehicleType?: string;
  vehiclePlateNumber?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  assignedOrdersCount?: number;
  activeOrdersCount?: number;
  completedOrdersCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourierPayout {
  id: string;
  restaurantId: string;
  deliveryPersonId: string;
  deliveryPersonName: string;
  ordersCount: number;
  orderIds: string[];
  amount: number;
  feePerOrder: number;
  status: 'PAID';
  paidAt: string;
  notes?: string;
  createdAt: string;
}

export type FinancePeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface RevenueStats {
  period: FinancePeriod;
  startDate: string;
  endDate: string;
  totalOrdersCount: number;
  deliveredOrdersCount: number;
  totalRevenue: number;
  totalDeliveryDues: number;
  deliveredOrders: Order[];
}

export interface CourierDueItem {
  deliveryPersonId: string;
  deliveryPersonName: string;
  phone: string;
  feePerOrder: number;
  todayDeliveredCount: number;  // عدد الطلبات المسلمة اليوم
  totalDeliveredCount: number;
  unpaidDeliveredCount: number;
  unpaidAmount: number;
  paidAmount: number;
  totalEarned: number;
  status: 'PAID' | 'UNPAID' | 'PARTIAL';
}

export interface CourierDuesSummary {
  period?: FinancePeriod;
  startDate?: string;
  endDate?: string;
  todayDeliveredCount: number;
  todayDeliveryDues: number;
  deliveredOrdersCount: number;
  totalDeliveryDues: number;
  unpaidDues: number;
  paidDues: number;
  couriers: CourierDueItem[];
  recentPayouts: CourierPayout[];
}

export interface MyCourierDues {
  feePerOrder: number;
  today: {
    deliveredCount: number;
    earnedAmount: number;
  };
  unpaid: {
    ordersCount: number;
    amount: number;
  };
  paid: {
    totalPaidAmount: number;
    payouts: CourierPayout[];
  };
  history: {
    date: string;
    deliveredCount: number;
    earnedAmount: number;
    orders: Array<{
      id: string;
      orderNumber: string;
      deliveredAt?: string;
      total: number;
      isPaid: boolean;
    }>;
  }[];
}

export interface CreateDeliveryPersonInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  vehicleType?: string;
  vehiclePlateNumber?: string;
  deliveryFeePerOrder?: number;
}

export interface UpdateDeliveryPersonInput {
  name?: string;
  phone?: string;
  vehicleType?: string;
  vehiclePlateNumber?: string;
  isActive?: boolean;
  isAvailable?: boolean;
  deliveryFeePerOrder?: number;
}

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  notes?: string;
}

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  wilaya: string;
  daira?: string;
  commune: string;
  neighborhood: string;
  address: string;
  notes?: string;
  deliveryZoneId: string;
  items: CreateOrderItemInput[];
  paymentMethod?: PaymentMethod;
  idempotencyKey?: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  restaurantId?: string;
  isActive: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

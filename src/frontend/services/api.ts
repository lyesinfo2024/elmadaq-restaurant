import {
  Restaurant,
  Category,
  Product,
  DeliveryZone,
  SafeUser,
  Order,
  CreateOrderInput,
  OrderStatus,
  DeliveryPerson,
  CreateDeliveryPersonInput,
  UpdateDeliveryPersonInput,
  CourierDuesSummary,
  CourierPayout,
  MyCourierDues,
} from '../types/index.ts';

const BASE_URL = '/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  count?: number;
}

export const api = {
  // Restaurant Settings
  async getRestaurant(): Promise<Restaurant> {
    const res = await fetch(`${BASE_URL}/restaurant`);
    const json: ApiResponse<Restaurant> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في تحميل بيانات المطعم');
    }
    return json.data;
  },

  async updateRestaurant(data: Partial<Restaurant>, token: string): Promise<Restaurant> {
    const res = await fetch(`${BASE_URL}/restaurant`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const json: ApiResponse<Restaurant> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في تحديث بيانات المطعم');
    }
    return json.data;
  },

  // Delivery Zones (الجزائر)
  async getDeliveryZones(all = false): Promise<DeliveryZone[]> {
    const res = await fetch(`${BASE_URL}/delivery-zones?all=${all}`);
    const json: ApiResponse<DeliveryZone[]> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في تحميل مناطق وأسعار التوصيل');
    }
    return json.data;
  },

  // Categories
  async getCategories(all = false): Promise<Category[]> {
    const res = await fetch(`${BASE_URL}/categories?all=${all}`);
    const json: ApiResponse<Category[]> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في تحميل تصنيفات الوجبات');
    }
    return json.data;
  },

  async getCategoryById(id: string): Promise<Category> {
    const res = await fetch(`${BASE_URL}/categories/${id}`);
    const json: ApiResponse<Category> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في تحميل التصنيف');
    }
    return json.data;
  },

  // Products
  async getProducts(params?: {
    categoryId?: string;
    search?: string;
    featured?: boolean;
    all?: boolean;
  }): Promise<Product[]> {
    const query = new URLSearchParams();
    if (params?.categoryId) query.append('categoryId', params.categoryId);
    if (params?.search) query.append('search', params.search);
    if (params?.featured) query.append('featured', 'true');
    if (params?.all) query.append('all', 'true');

    const res = await fetch(`${BASE_URL}/products?${query.toString()}`);
    const json: ApiResponse<Product[]> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في تحميل قائمة الوجبات');
    }
    return json.data;
  },

  async getProductById(id: string): Promise<Product> {
    const res = await fetch(`${BASE_URL}/products/${id}`);
    const json: ApiResponse<Product> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في تحميل تفاصيل الوجبة');
    }
    return json.data;
  },

  // Orders (Customer Endpoints)
  async createOrder(orderInput: CreateOrderInput): Promise<Order> {
    const res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderInput),
    });
    const json: ApiResponse<Order> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في إنشاء الطلب');
    }
    return json.data;
  },

  async getOrderById(id: string): Promise<Order> {
    const res = await fetch(`${BASE_URL}/orders/${id}`);
    const json: ApiResponse<Order> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في تحميل بيانات الطلب');
    }
    return json.data;
  },

  async trackOrder(orderNumber: string): Promise<Order> {
    const cleanNum = encodeURIComponent(orderNumber.trim());
    const res = await fetch(`${BASE_URL}/orders/track/${cleanNum}`);
    const json: ApiResponse<Order> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في العثور على الطلب');
    }
    return json.data;
  },

  // Admin Orders Management (Protected)
  async getAdminOrders(token: string): Promise<Order[]> {
    const res = await fetch(`${BASE_URL}/admin/orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json: ApiResponse<Order[]> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في جلب قائمة الطلبات للإدارة');
    }
    return json.data;
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, token: string): Promise<Order> {
    const res = await fetch(`${BASE_URL}/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    const json: ApiResponse<Order> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في تحديث حالة الطلب');
    }
    return json.data;
  },

  // Assign Order to Delivery Staff
  async assignOrderToStaff(
    orderId: string,
    deliveryPersonId: string | null,
    token: string
  ): Promise<Order> {
    const res = await fetch(`${BASE_URL}/admin/orders/${orderId}/assign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ deliveryPersonId }),
    });
    const json: ApiResponse<Order> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في إسناد الطلب');
    }
    return json.data;
  },

  // Delivery Staff Management (Admin)
  async getDeliveryStaff(token: string): Promise<DeliveryPerson[]> {
    const res = await fetch(`${BASE_URL}/admin/delivery-staff`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json: ApiResponse<DeliveryPerson[]> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في تحميل قائمة عمال التوصيل');
    }
    return json.data;
  },

  async createDeliveryStaff(
    data: CreateDeliveryPersonInput,
    token: string
  ): Promise<DeliveryPerson> {
    const res = await fetch(`${BASE_URL}/admin/delivery-staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const json: ApiResponse<DeliveryPerson> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في إضافة عامل التوصيل');
    }
    return json.data;
  },

  async updateDeliveryStaff(
    id: string,
    data: UpdateDeliveryPersonInput,
    token: string
  ): Promise<DeliveryPerson> {
    const res = await fetch(`${BASE_URL}/admin/delivery-staff/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const json: ApiResponse<DeliveryPerson> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في تحديث بيانات عامل التوصيل');
    }
    return json.data;
  },

  async toggleDeliveryStaffStatus(id: string, token: string): Promise<DeliveryPerson> {
    const res = await fetch(`${BASE_URL}/admin/delivery-staff/${id}/toggle-status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json: ApiResponse<DeliveryPerson> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في تغيير حالة تفعيل عامل التوصيل');
    }
    return json.data;
  },

  // Delivery Driver Portal (Driver Role)
  async getDeliveryProfile(token: string): Promise<{
    driver: DeliveryPerson;
    stats: {
      activeCount: number;
      todayDeliveredCount: number;
      todayCollectedCash: number;
      totalAssigned: number;
    };
  }> {
    const res = await fetch(`${BASE_URL}/delivery/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json: ApiResponse<{
      driver: DeliveryPerson;
      stats: {
        activeCount: number;
        todayDeliveredCount: number;
        todayCollectedCash: number;
        totalAssigned: number;
      };
    }> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في تحميل الملف الشخصي لعامل التوصيل');
    }
    return json.data;
  },

  async getDeliveryOrders(token: string): Promise<Order[]> {
    const res = await fetch(`${BASE_URL}/delivery/orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json: ApiResponse<Order[]> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في جلب طلبات التوصيل المسندة');
    }
    return json.data;
  },

  async updateDeliveryDriverOrderStatus(
    orderId: string,
    status: OrderStatus,
    reason: string | undefined,
    token: string
  ): Promise<Order> {
    const res = await fetch(`${BASE_URL}/delivery/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, reason }),
    });
    const json: ApiResponse<Order> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في تحديث حالة طلب التوصيل');
    }
    return json.data;
  },

  async toggleDriverAvailability(
    isAvailable: boolean | undefined,
    token: string
  ): Promise<DeliveryPerson> {
    const res = await fetch(`${BASE_URL}/delivery/availability`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isAvailable }),
    });
    const json: ApiResponse<DeliveryPerson> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في تحديث حالة التوفر');
    }
    return json.data;
  },

  // Dues & Finance Management (المستحقات والمداخيل)
  async getCourierDuesSummary(token: string): Promise<CourierDuesSummary> {
    const res = await fetch(`${BASE_URL}/admin/delivery-staff/dues/summary`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json: ApiResponse<CourierDuesSummary> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في جلب تقرير مستحقات التوصيل');
    }
    return json.data;
  },

  async recordCourierPayout(
    driverId: string,
    notes: string | undefined,
    token: string
  ): Promise<CourierPayout> {
    const res = await fetch(`${BASE_URL}/admin/delivery-staff/${driverId}/payout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ notes }),
    });
    const json: ApiResponse<CourierPayout> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في تسجيل تسوية مستحقات التوصيل');
    }
    return json.data;
  },

  async getMyCourierDues(token: string): Promise<MyCourierDues> {
    const res = await fetch(`${BASE_URL}/delivery/dues`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json: ApiResponse<MyCourierDues> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في استخراج مستحقات التوصيل الخاصة بك');
    }
    return json.data;
  },

  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: SafeUser }> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const json: ApiResponse<{ token: string; user: SafeUser }> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل تسجيل الدخول');
    }
    return json.data;
  },

  async getCurrentUser(token: string): Promise<SafeUser> {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json: ApiResponse<SafeUser> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'فشل في التحقق من المستخدم');
    }
    return json.data;
  },
};

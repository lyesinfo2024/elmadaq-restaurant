import bcrypt from 'bcryptjs';
import {
  Restaurant,
  Category,
  Product,
  DeliveryZone,
  User,
  SafeUser,
  Order,
  OrderItem,
  OrderStatus,
  CreateOrderInput,
  DeliveryPerson,
  CreateDeliveryPersonInput,
  UpdateDeliveryPersonInput,
  DeliveryPersonSummary,
  CourierPayout,
  CourierDuesSummary,
  MyCourierDues,
  CourierDueItem,
} from '../types/index.ts';
import {
  INITIAL_RESTAURANT,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_DELIVERY_ZONES,
  INITIAL_USERS_RAW,
  INITIAL_DELIVERY_PEOPLE,
} from './seedData.ts';
import { isValidAlgerianPhone } from '../middleware/validationMiddleware.ts';

class DatabaseStore {
  private restaurant: Restaurant = { ...INITIAL_RESTAURANT };
  private categories: Category[] = [...INITIAL_CATEGORIES];
  private products: Product[] = [...INITIAL_PRODUCTS];
  private deliveryZones: DeliveryZone[] = [...INITIAL_DELIVERY_ZONES];
  private users: User[] = [];
  private deliveryPeople: DeliveryPerson[] = [...INITIAL_DELIVERY_PEOPLE];
  private orders: Order[] = [];
  private courierPayouts: CourierPayout[] = [];
  private orderCounter = 1000;
  private idempotencyCache = new Map<string, { order: Order; timestamp: number }>();
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;

    // Hash passwords for initial seed users with bcrypt
    this.users = await Promise.all(
      INITIAL_USERS_RAW.map(async (u) => {
        const passwordHash = await bcrypt.hash(u.passwordPlain, 10);
        return {
          id: u.id,
          restaurantId: u.restaurantId,
          name: u.name,
          email: u.email,
          passwordHash,
          phone: u.phone,
          role: u.role,
          isActive: u.isActive,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      })
    );

    // Initial Seed Orders for demo and testing
    this.orderCounter = 1002;
    const initialOrder1: Order = {
      id: 'ord-seed-1001',
      orderNumber: '#1001',
      restaurantId: 'rest-dz-001',
      status: 'CONFIRMED',
      orderType: 'DELIVERY',
      paymentMethod: 'CASH_ON_DELIVERY',
      paymentStatus: 'UNPAID',
      subtotal: 1200,
      deliveryFee: 250,
      total: 1450,
      customerName: 'كريم بن ناصر',
      customerPhone: '0555123456',
      wilaya: 'الجزائر العاصمة',
      commune: 'القصبة',
      daira: 'باب الواد',
      neighborhood: 'حي الشهداء',
      address: 'شارع العربي بن مهيدي، العمارة 4، الطابق 2، شقة 5',
      deliveryAddress: 'شارع العربي بن مهيدي، العمارة 4، الطابق 2، شقة 5',
      notes: 'يرجى الاتصال بي عند الوصول للباب الخارجي',
      deliveryPersonId: 'dp-01',
      deliveryPerson: {
        id: 'dp-01',
        name: 'كريم دراجي',
        phone: '0770345678',
        vehicleType: 'دراجة نارية (Moto SYM)',
        vehiclePlateNumber: '16-45892-001',
        isAvailable: true,
      },
      items: [
        {
          id: 'item-1001-1',
          orderId: 'ord-seed-1001',
          productId: 'prod-dz-01',
          productName: 'سندويتش شاورما دجاج جامبو بالخبز السوري',
          unitPrice: 450,
          quantity: 2,
          totalPrice: 900,
          notes: 'زيادة صلصة حارة',
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          id: 'item-1001-2',
          orderId: 'ord-seed-1001',
          productId: 'prod-dz-13',
          productName: 'سلطة حميس عاصمي حار مشوي بزيت الزيتون',
          unitPrice: 300,
          quantity: 1,
          totalPrice: 300,
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    };

    const initialOrder2: Order = {
      id: 'ord-seed-1002',
      orderNumber: '#1002',
      restaurantId: 'rest-dz-001',
      status: 'PREPARING',
      orderType: 'DELIVERY',
      paymentMethod: 'CASH_ON_DELIVERY',
      paymentStatus: 'UNPAID',
      subtotal: 1850,
      deliveryFee: 300,
      total: 2150,
      customerName: 'فاطمة الزهراء بوجمعة',
      customerPhone: '0662987654',
      wilaya: 'الجزائر العاصمة',
      commune: 'حيدرة',
      daira: 'بئر مراد رايس',
      neighborhood: 'حي بارادو',
      address: 'شارع سيدي يحيى، إقامة الورود، العمارة ب، شقة 14',
      deliveryAddress: 'شارع سيدي يحيى، إقامة الورود، العمارة ب، شقة 14',
      notes: 'بدون بصل في الطاكوس رجاءً',
      items: [
        {
          id: 'item-1002-1',
          orderId: 'ord-seed-1002',
          productId: 'prod-dz-04',
          productName: 'طبق ميكس مشاوي البهجة الملكي على الفحم',
          unitPrice: 1200,
          quantity: 1,
          totalPrice: 1200,
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: 'item-1002-2',
          orderId: 'ord-seed-1002',
          productId: 'prod-dz-07',
          productName: 'طاكوس جزائري دبل ماكسي بلحم مفروم ودجاج',
          unitPrice: 650,
          quantity: 1,
          totalPrice: 650,
          notes: 'بدون بصل',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
      ],
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const driverSummary1: DeliveryPersonSummary = {
      id: 'dp-01',
      name: 'كريم دراجي',
      phone: '0770345678',
      vehicleType: 'دراجة نارية (Moto SYM)',
      vehiclePlateNumber: '16-45892-001',
      isAvailable: true,
    };

    // Delivered Today Order (#1003) - Assigned to Karim Derradji (Unpaid)
    const initialOrder3: Order = {
      id: 'ord-seed-1003',
      orderNumber: '#1003',
      restaurantId: 'rest-dz-001',
      status: 'DELIVERED',
      orderType: 'DELIVERY',
      paymentMethod: 'CASH_ON_DELIVERY',
      paymentStatus: 'PAID',
      subtotal: 1350,
      deliveryFee: 200,
      total: 1550,
      customerName: 'جمال عبد النور',
      customerPhone: '0770123987',
      wilaya: 'الجزائر العاصمة',
      commune: 'سيدي امحمد',
      daira: 'سيدي امحمد',
      neighborhood: 'نهج موريتانيا',
      address: 'عمارة 8، الطابق الثالث',
      deliveryPersonId: 'dp-01',
      deliveryPerson: driverSummary1,
      courierPaid: false,
      courierFeeAtDelivery: 100,
      deliveredAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      items: [
        {
          id: 'item-1003-1',
          orderId: 'ord-seed-1003',
          productId: 'prod-dz-02',
          productName: 'سندويتش شاورما دجاج بخبز الصاج العاصمي',
          unitPrice: 450,
          quantity: 3,
          totalPrice: 1350,
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    };

    // Delivered Yesterday Order (#1004) - Assigned to Karim Derradji (Paid payout)
    const yesterdayDate = new Date(Date.now() - 86400000);
    const initialOrder4: Order = {
      id: 'ord-seed-1004',
      orderNumber: '#1004',
      restaurantId: 'rest-dz-001',
      status: 'DELIVERED',
      orderType: 'DELIVERY',
      paymentMethod: 'CASH_ON_DELIVERY',
      paymentStatus: 'PAID',
      subtotal: 1800,
      deliveryFee: 300,
      total: 2100,
      customerName: 'سفيان مرابط',
      customerPhone: '0550998877',
      wilaya: 'الجزائر العاصمة',
      commune: 'المرادية',
      daira: 'سيدي امحمد',
      neighborhood: 'حي ديار المحصول',
      address: 'شارع فلسطين، فيلا رقم 12',
      deliveryPersonId: 'dp-01',
      deliveryPerson: driverSummary1,
      courierPaid: true,
      courierPayoutId: 'pay-seed-01',
      courierFeeAtDelivery: 100,
      deliveredAt: yesterdayDate.toISOString(),
      items: [
        {
          id: 'item-1004-1',
          orderId: 'ord-seed-1004',
          productId: 'prod-dz-01',
          productName: 'سندويتش شاورما دجاج جزائرية مع بطاطا وصلصة ثومية',
          unitPrice: 450,
          quantity: 4,
          totalPrice: 1800,
          createdAt: yesterdayDate.toISOString(),
        },
      ],
      createdAt: yesterdayDate.toISOString(),
      updatedAt: yesterdayDate.toISOString(),
    };

    this.courierPayouts = [
      {
        id: 'pay-seed-01',
        restaurantId: 'rest-dz-001',
        deliveryPersonId: 'dp-01',
        deliveryPersonName: 'كريم دراجي',
        ordersCount: 1,
        orderIds: ['ord-seed-1004'],
        amount: 100,
        feePerOrder: 100,
        status: 'PAID',
        paidAt: yesterdayDate.toISOString(),
        notes: 'تسوية مستحقات يوم أمس',
        createdAt: yesterdayDate.toISOString(),
      },
    ];

    this.orders = [initialOrder3, initialOrder2, initialOrder1, initialOrder4];
    this.orderCounter = 1004;

    this.isInitialized = true;
    console.log('[DatabaseStore] Initialized successfully with Phase 2 Order & Management features.');
  }

  // Restaurant queries
  getRestaurant(): Restaurant {
    return { ...this.restaurant };
  }

  updateRestaurant(data: Partial<Restaurant>): Restaurant {
    this.restaurant = {
      ...this.restaurant,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return { ...this.restaurant };
  }

  // Delivery Zones
  getDeliveryZones(onlyActive = true): DeliveryZone[] {
    let zones = [...this.deliveryZones];
    if (onlyActive) {
      zones = zones.filter((z) => z.isActive);
    }
    return zones.sort((a, b) => a.deliveryFee - b.deliveryFee);
  }

  getDeliveryZoneById(id: string): DeliveryZone | null {
    const zone = this.deliveryZones.find((z) => z.id === id);
    return zone ? { ...zone } : null;
  }

  // Category queries
  getCategories(onlyActive = true): Category[] {
    let list = [...this.categories];
    if (onlyActive) {
      list = list.filter((c) => c.isActive);
    }
    return list.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  getCategoryById(id: string): Category | null {
    const cat = this.categories.find((c) => c.id === id);
    return cat ? { ...cat } : null;
  }

  // Product queries
  getProducts(filter?: {
    categoryId?: string;
    isAvailableOnly?: boolean;
    search?: string;
    isFeaturedOnly?: boolean;
  }): Product[] {
    let list = [...this.products];

    if (filter?.categoryId) {
      list = list.filter((p) => p.categoryId === filter.categoryId);
    }

    if (filter?.isAvailableOnly) {
      list = list.filter((p) => p.isAvailable);
    }

    if (filter?.isFeaturedOnly) {
      list = list.filter((p) => p.isFeatured);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.tags && p.tags.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  getProductById(id: string): Product | null {
    const prod = this.products.find((p) => p.id === id);
    return prod ? { ...prod } : null;
  }

  // For testing purposes: update product price/availability
  updateProduct(id: string, updates: Partial<Product>): Product | null {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return null;
    this.products[index] = {
      ...this.products[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return { ...this.products[index] };
  }

  // User queries
  getUserByEmail(email: string): User | null {
    const user = this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return user ? { ...user } : null;
  }

  getUserById(id: string): User | null {
    const user = this.users.find((u) => u.id === id);
    return user ? { ...user } : null;
  }

  toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      restaurantId: user.restaurantId,
      isActive: user.isActive,
    };
  }

  // ==========================================
  // PHASE 2: ORDERS ENGINE (ATOMIC TRANSACTION & SECURE CALCULATION)
  // ==========================================

  /**
   * إنشاء طلب جديد داخل Database Transaction آمنة:
   * 1. فحص وجود المطعم
   * 2. فحص السلة والتأكد من عدم فراغها
   * 3. جلب الوجبات من قاعدة البيانات والتحقق من وجودها وتوفرها
   * 4. قراءة السعر من قاعدة البيانات حصراً وحساب الأسعار بشكل مستقل
   * 5. تجميد اسم وسعر كل وجبة تاريخياً في OrderItem
   * 6. التحقق من منطقة التوصيل وحساب رسوم التوصيل والمجموع النهائي
   * 7. توليد رقم طلب تسلسلي واضح مثل #1003
   * 8. حفظ الطلب في عملية واحدة مكتملة
   */
  async createOrder(input: CreateOrderInput): Promise<Order> {
    // 1. Idempotency Check: Prevent duplicate submissions
    if (input.idempotencyKey) {
      const cached = this.idempotencyCache.get(input.idempotencyKey);
      if (cached && Date.now() - cached.timestamp < 120000) {
        // Return previously created order if repeated within 2 minutes
        return cached.order;
      }
    }

    // 2. Validation: Customer info
    if (!input.customerName || typeof input.customerName !== 'string' || input.customerName.trim().length === 0) {
      throw new Error('يرجى إدخال الاسم واللقب بشكل صحيح');
    }

    if (!input.customerPhone || !isValidAlgerianPhone(input.customerPhone)) {
      throw new Error('يرجى إدخال رقم هاتف جزائري صحيح (مثال: 0550123456 أو 0661234567 أو 0770123456)');
    }

    if (!input.wilaya || typeof input.wilaya !== 'string' || input.wilaya.trim().length === 0) {
      throw new Error('يرجى تحديد الولاية');
    }

    if (!input.commune || typeof input.commune !== 'string' || input.commune.trim().length === 0) {
      throw new Error('يرجى تحديد البلدية');
    }

    if (!input.neighborhood || typeof input.neighborhood !== 'string' || input.neighborhood.trim().length === 0) {
      throw new Error('يرجى إدخال الحي أو المنطقة');
    }

    if (!input.address || typeof input.address !== 'string' || input.address.trim().length === 0) {
      throw new Error('يرجى إدخال العنوان التفصيلي (الشارع ورقم العمارة والطابق)');
    }

    // 3. Validation: Empty Cart
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error('السلة فارغة، يرجى اختيار وجبة واحدة على الأقل لإتمام الطلب');
    }

    // 4. Validation & Pricing: Delivery Zone from Database
    if (!input.deliveryZoneId) {
      throw new Error('يرجى اختيار منطقة وبلدية التوصيل');
    }

    const zone = this.getDeliveryZoneById(input.deliveryZoneId);
    if (!zone || !zone.isActive) {
      throw new Error('منطقة التوصيل المختارة غير صالحة أو غير نشطة حالياً');
    }

    // 5. ATOMIC VERIFICATION & SECURE CALCULATION FROM DATABASE
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const orderItems: OrderItem[] = [];
    let calculatedSubtotal = 0;

    for (const itemInput of input.items) {
      if (!itemInput.productId) {
        throw new Error('معرف الوجبة مفقود في الطلب');
      }

      // Check product in DB
      const dbProduct = this.getProductById(itemInput.productId);
      if (!dbProduct) {
        throw new Error(`الوجبة المطلوبة (المعرف: ${itemInput.productId}) غير موجودة في قائمة المطعم`);
      }

      // Check availability
      if (!dbProduct.isAvailable) {
        throw new Error(`نعتذر، الوجبة "${dbProduct.name}" غير متوفرة حالياً في المطبخ`);
      }

      // Check quantity is positive integer
      const quantity = Number(itemInput.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error(`الكمية المحددة للوجبة "${dbProduct.name}" يجب أن تكون عدداً صحيحاً أكبر من صفر`);
      }

      // Freeze historical snapshot: price from DB (never client!)
      const unitPrice = dbProduct.price;
      const itemTotalPrice = unitPrice * quantity;
      calculatedSubtotal += itemTotalPrice;

      orderItems.push({
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        orderId,
        productId: dbProduct.id,
        productName: dbProduct.name, // Frozen historical name
        unitPrice,                   // Frozen historical unit price in DZD
        quantity,
        totalPrice: itemTotalPrice,
        notes: itemInput.notes?.trim() || undefined,
        createdAt: new Date().toISOString(),
      });
    }

    // Check Minimum Order Amount for this zone
    if (calculatedSubtotal < zone.minOrderAmount) {
      throw new Error(
        `الحد الأدنى للطلب لمنطقة "${zone.commune}" هو ${zone.minOrderAmount} دج. مجموع وجباتك الحالي هو ${calculatedSubtotal} دج`
      );
    }

    // Exact delivery fee from DB
    const deliveryFee = zone.deliveryFee;
    const finalTotal = calculatedSubtotal + deliveryFee;

    // Generate unique human-readable order number
    this.orderCounter += 1;
    const orderNumber = `#${this.orderCounter}`;

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      restaurantId: this.restaurant.id,
      status: 'NEW',
      orderType: 'DELIVERY',
      paymentMethod: input.paymentMethod || 'CASH_ON_DELIVERY',
      paymentStatus: 'UNPAID',
      subtotal: calculatedSubtotal,
      deliveryFee,
      total: finalTotal,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      wilaya: input.wilaya.trim(),
      daira: input.daira?.trim() || undefined,
      commune: input.commune.trim(),
      neighborhood: input.neighborhood.trim(),
      address: input.address.trim(),
      deliveryAddress: input.address.trim(),
      notes: input.notes?.trim() || undefined,
      items: orderItems,
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save atomically
    this.orders.unshift(newOrder);

    // Cache idempotency key
    if (input.idempotencyKey) {
      this.idempotencyCache.set(input.idempotencyKey, {
        order: newOrder,
        timestamp: Date.now(),
      });
    }

    console.log(`[DatabaseStore] Order created successfully: ${orderNumber} for ${newOrder.customerName}, Total: ${finalTotal} DZD`);
    return newOrder;
  }

  // Get single order by ID
  getOrderById(id: string): Order | null {
    const order = this.orders.find((o) => o.id === id);
    return order ? JSON.parse(JSON.stringify(order)) : null;
  }

  // Get single order by order number (e.g. #1001 or 1001)
  getOrderByNumber(num: string): Order | null {
    const cleanNum = num.trim().startsWith('#') ? num.trim() : `#${num.trim()}`;
    const order = this.orders.find((o) => o.orderNumber.toLowerCase() === cleanNum.toLowerCase());
    return order ? JSON.parse(JSON.stringify(order)) : null;
  }

  // Get all orders (for Admin/Manager dashboard)
  getAllOrders(): Order[] {
    return JSON.parse(JSON.stringify(this.orders)).sort(
      (a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Update order status (Admin / Manager only)
  updateOrderStatus(orderId: string, newStatus: OrderStatus): Order {
    const validStatuses: OrderStatus[] = [
      'NEW',
      'CONFIRMED',
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ];

    if (!validStatuses.includes(newStatus)) {
      throw new Error(`حالة الطلب غير صالحة: ${newStatus}`);
    }

    const orderIndex = this.orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) {
      throw new Error('الطلب المطلوب غير موجود');
    }

    this.orders[orderIndex] = {
      ...this.orders[orderIndex],
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    if (newStatus === 'DELIVERED') {
      this.orders[orderIndex].paymentStatus = 'PAID';
      if (!this.orders[orderIndex].deliveredAt) {
        this.orders[orderIndex].deliveredAt = new Date().toISOString();
      }
      if (this.orders[orderIndex].deliveryPersonId) {
        const dp = this.deliveryPeople.find((p) => p.id === this.orders[orderIndex].deliveryPersonId);
        const fee = dp?.deliveryFeePerOrder ?? this.restaurant.defaultCourierFeePerOrder ?? 100;
        if (this.orders[orderIndex].courierFeeAtDelivery === undefined) {
          this.orders[orderIndex].courierFeeAtDelivery = fee;
        }
        if (this.orders[orderIndex].courierPaid === undefined) {
          this.orders[orderIndex].courierPaid = false;
        }
      }
    }

    console.log(`[DatabaseStore] Order ${this.orders[orderIndex].orderNumber} status changed to ${newStatus}`);
    return JSON.parse(JSON.stringify(this.orders[orderIndex]));
  }

  // ==========================================
  // Delivery Staff Management (Phase 3)
  // ==========================================

  // Get all delivery personnel with their statistics
  getAllDeliveryPeople(): DeliveryPerson[] {
    return this.deliveryPeople.map((dp) => {
      const assigned = this.orders.filter((o) => o.deliveryPersonId === dp.id);
      const active = assigned.filter((o) =>
        ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status)
      );
      const completed = assigned.filter((o) => o.status === 'DELIVERED');

      return {
        ...dp,
        assignedOrdersCount: assigned.length,
        activeOrdersCount: active.length,
        completedOrdersCount: completed.length,
      };
    });
  }

  // Get delivery person by ID
  getDeliveryPersonById(id: string): DeliveryPerson | null {
    const dp = this.deliveryPeople.find((p) => p.id === id);
    if (!dp) return null;

    const assigned = this.orders.filter((o) => o.deliveryPersonId === dp.id);
    const active = assigned.filter((o) =>
      ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status)
    );
    const completed = assigned.filter((o) => o.status === 'DELIVERED');

    return {
      ...dp,
      assignedOrdersCount: assigned.length,
      activeOrdersCount: active.length,
      completedOrdersCount: completed.length,
    };
  }

  // Get delivery person by user ID
  getDeliveryPersonByUserId(userId: string): DeliveryPerson | null {
    const dp = this.deliveryPeople.find((p) => p.userId === userId);
    if (!dp) return null;
    return this.getDeliveryPersonById(dp.id);
  }

  // Create new delivery person (Admin only)
  async createDeliveryPerson(input: CreateDeliveryPersonInput): Promise<DeliveryPerson> {
    const cleanPhone = input.phone.trim();
    if (!isValidAlgerianPhone(cleanPhone)) {
      throw new Error('رقم الهاتف غير صالح، يجب أن يكون رقم جزائري يبدأ بـ 05 أو 06 أو 07 ويتكون من 10 أرقام');
    }

    const cleanEmail = input.email.trim().toLowerCase();
    if (this.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('البريد الإلكتروني مسجل مسبقاً لمستخدم آخر');
    }

    if (!input.password || input.password.length < 6) {
      throw new Error('كلمة المرور يجب أن لا تقل عن 6 أحرف');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const userId = `usr-del-dz-${Date.now().toString().slice(-6)}`;
    const dpId = `dp-${Date.now().toString().slice(-6)}`;

    const newUser: User = {
      id: userId,
      restaurantId: this.restaurant.id,
      name: input.name.trim(),
      email: cleanEmail,
      passwordHash,
      phone: cleanPhone,
      role: 'DELIVERY',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.push(newUser);

    const newDeliveryPerson: DeliveryPerson = {
      id: dpId,
      restaurantId: this.restaurant.id,
      userId,
      name: input.name.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      isActive: true,
      isAvailable: true,
      deliveryFeePerOrder: input.deliveryFeePerOrder !== undefined
        ? Math.max(0, Math.round(Number(input.deliveryFeePerOrder)))
        : (this.restaurant.defaultCourierFeePerOrder ?? 100),
      vehicleType: input.vehicleType ? input.vehicleType.trim() : 'توصيل',
      vehiclePlateNumber: input.vehiclePlateNumber?.trim() || undefined,
      assignedOrdersCount: 0,
      activeOrdersCount: 0,
      completedOrdersCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.deliveryPeople.push(newDeliveryPerson);

    console.log(`[DatabaseStore] Created delivery person: ${newDeliveryPerson.name} (${newDeliveryPerson.id})`);
    return JSON.parse(JSON.stringify(newDeliveryPerson));
  }

  // Update delivery person details
  updateDeliveryPerson(id: string, input: UpdateDeliveryPersonInput): DeliveryPerson {
    const dpIndex = this.deliveryPeople.findIndex((p) => p.id === id);
    if (dpIndex === -1) {
      throw new Error('عامل التوصيل غير موجود');
    }

    if (input.phone) {
      const cleanPhone = input.phone.trim();
      if (!isValidAlgerianPhone(cleanPhone)) {
        throw new Error('رقم الهاتف غير صالح، يجب أن يكون رقم جزائري 05/06/07');
      }
      this.deliveryPeople[dpIndex].phone = cleanPhone;
    }

    if (input.name) {
      this.deliveryPeople[dpIndex].name = input.name.trim();
    }
    if (input.deliveryFeePerOrder !== undefined) {
      this.deliveryPeople[dpIndex].deliveryFeePerOrder = Math.max(0, Math.round(Number(input.deliveryFeePerOrder)));
    }
    if (input.vehicleType !== undefined) {
      this.deliveryPeople[dpIndex].vehicleType = input.vehicleType.trim();
    }
    if (input.vehiclePlateNumber !== undefined) {
      this.deliveryPeople[dpIndex].vehiclePlateNumber = input.vehiclePlateNumber.trim() || undefined;
    }
    if (input.isActive !== undefined) {
      this.deliveryPeople[dpIndex].isActive = input.isActive;
      if (!input.isActive) {
        this.deliveryPeople[dpIndex].isAvailable = false;
      }
    }
    if (input.isAvailable !== undefined) {
      this.deliveryPeople[dpIndex].isAvailable = input.isAvailable;
    }

    this.deliveryPeople[dpIndex].updatedAt = new Date().toISOString();

    // Also update associated User
    const userIndex = this.users.findIndex((u) => u.id === this.deliveryPeople[dpIndex].userId);
    if (userIndex !== -1) {
      if (input.name) this.users[userIndex].name = input.name.trim();
      if (input.phone) this.users[userIndex].phone = input.phone.trim();
      if (input.isActive !== undefined) this.users[userIndex].isActive = input.isActive;
      this.users[userIndex].updatedAt = new Date().toISOString();
    }

    // Sync delivery summary in active orders
    const dp = this.deliveryPeople[dpIndex];
    this.orders.forEach((o) => {
      if (o.deliveryPersonId === dp.id) {
        o.deliveryPerson = {
          id: dp.id,
          name: dp.name,
          phone: dp.phone,
          vehicleType: dp.vehicleType,
          vehiclePlateNumber: dp.vehiclePlateNumber,
          isAvailable: dp.isAvailable,
        };
      }
    });

    return this.getDeliveryPersonById(id)!;
  }

  // Toggle delivery person active status
  toggleDeliveryPersonStatus(id: string): DeliveryPerson {
    const dp = this.deliveryPeople.find((p) => p.id === id);
    if (!dp) throw new Error('عامل التوصيل غير موجود');
    return this.updateDeliveryPerson(id, { isActive: !dp.isActive });
  }

  // Set availability (e.g. driver goes online / offline)
  setDeliveryPersonAvailability(id: string, isAvailable: boolean): DeliveryPerson {
    const dp = this.deliveryPeople.find((p) => p.id === id);
    if (!dp) throw new Error('عامل التوصيل غير موجود');
    if (!dp.isActive && isAvailable) {
      throw new Error('لا يمكن تفعيل التواجد لحساب معطل من قبل الإدارة');
    }
    return this.updateDeliveryPerson(id, { isAvailable });
  }

  // Assign or unassign order to a delivery person
  assignOrderToDeliveryPerson(orderId: string, deliveryPersonId: string | null): Order {
    const orderIndex = this.orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) {
      throw new Error('الطلب غير موجود');
    }

    if (!deliveryPersonId) {
      // Unassign
      this.orders[orderIndex] = {
        ...this.orders[orderIndex],
        deliveryPersonId: undefined,
        deliveryPerson: undefined,
        updatedAt: new Date().toISOString(),
      };
      console.log(`[DatabaseStore] Order ${this.orders[orderIndex].orderNumber} unassigned from delivery.`);
      return JSON.parse(JSON.stringify(this.orders[orderIndex]));
    }

    const dp = this.deliveryPeople.find((p) => p.id === deliveryPersonId);
    if (!dp) {
      throw new Error('عامل التوصيل المحدد غير موجود');
    }
    if (!dp.isActive) {
      throw new Error('لا يمكن إسناد الطلب لعامل توصيل معطل');
    }

    let nextStatus = this.orders[orderIndex].status;
    if (nextStatus === 'NEW' || nextStatus === 'CONFIRMED') {
      nextStatus = 'READY';
    }

    this.orders[orderIndex] = {
      ...this.orders[orderIndex],
      deliveryPersonId: dp.id,
      deliveryPerson: {
        id: dp.id,
        name: dp.name,
        phone: dp.phone,
        vehicleType: dp.vehicleType,
        vehiclePlateNumber: dp.vehiclePlateNumber,
        isAvailable: dp.isAvailable,
      },
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    console.log(`[DatabaseStore] Order ${this.orders[orderIndex].orderNumber} assigned to driver ${dp.name}`);
    return JSON.parse(JSON.stringify(this.orders[orderIndex]));
  }

  // Get orders assigned to a specific delivery driver
  getOrdersForDeliveryPerson(deliveryPersonId: string): Order[] {
    return JSON.parse(
      JSON.stringify(
        this.orders
          .filter((o) => o.deliveryPersonId === deliveryPersonId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      )
    );
  }

  // Delivery driver status update
  updateDeliveryOrderStatus(
    deliveryPersonId: string,
    orderId: string,
    newStatus: OrderStatus,
    reason?: string
  ): Order {
    const orderIndex = this.orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) {
      throw new Error('الطلب غير موجود');
    }

    const currentOrder = this.orders[orderIndex];
    if (currentOrder.deliveryPersonId !== deliveryPersonId) {
      throw new Error('هذا الطلب غير مسند إليك');
    }

    const allowedStatuses: OrderStatus[] = ['READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    if (!allowedStatuses.includes(newStatus)) {
      throw new Error(`حالة غير مسموح لعامل التوصيل بتعيينها: ${newStatus}`);
    }

    const updatedOrder: Order = {
      ...currentOrder,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    // If marked delivered, update payment status to PAID (Cash collected in Algeria!)
    if (newStatus === 'DELIVERED') {
      updatedOrder.paymentStatus = 'PAID';
      if (!updatedOrder.deliveredAt) {
        updatedOrder.deliveredAt = new Date().toISOString();
      }
      const dp = this.deliveryPeople.find((p) => p.id === deliveryPersonId);
      const fee = dp?.deliveryFeePerOrder ?? this.restaurant.defaultCourierFeePerOrder ?? 100;
      if (updatedOrder.courierFeeAtDelivery === undefined) {
        updatedOrder.courierFeeAtDelivery = fee;
      }
      if (updatedOrder.courierPaid === undefined) {
        updatedOrder.courierPaid = false;
      }
    }

    if (newStatus === 'CANCELLED' && reason) {
      updatedOrder.cancellationReason = reason.trim();
    }

    this.orders[orderIndex] = updatedOrder;
    console.log(`[DatabaseStore] Delivery driver updated order ${updatedOrder.orderNumber} to ${newStatus}`);
    return JSON.parse(JSON.stringify(updatedOrder));
  }

  // ==========================================
  // Delivery Dues & Finance Management
  // ==========================================

  // Get dues & earnings for a specific delivery driver
  getCourierDues(deliveryPersonId: string): MyCourierDues {
    const dp = this.deliveryPeople.find((p) => p.id === deliveryPersonId);
    if (!dp) {
      throw new Error('عامل التوصيل غير موجود');
    }

    const feePerOrder = dp.deliveryFeePerOrder ?? this.restaurant.defaultCourierFeePerOrder ?? 100;

    // ONLY DELIVERED orders count!
    const deliveredOrders = this.orders.filter(
      (o) => o.deliveryPersonId === deliveryPersonId && o.status === 'DELIVERED'
    );

    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' }).format(new Date());

    const todayDelivered = deliveredOrders.filter((o) => {
      const d = o.deliveredAt || o.updatedAt || o.createdAt;
      return d.slice(0, 10) === todayStr;
    });

    const unpaidOrders = deliveredOrders.filter((o) => !o.courierPaid);
    const unpaidAmount = unpaidOrders.reduce(
      (sum, o) => sum + (o.courierFeeAtDelivery ?? feePerOrder),
      0
    );

    const payouts = this.courierPayouts
      .filter((p) => p.deliveryPersonId === deliveryPersonId)
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

    const totalPaidAmount = payouts.reduce((sum, p) => sum + p.amount, 0);

    // Group history by date (YYYY-MM-DD)
    const historyMap = new Map<string, Order[]>();
    for (const order of deliveredOrders) {
      const d = (order.deliveredAt || order.updatedAt || order.createdAt).slice(0, 10);
      if (!historyMap.has(d)) {
        historyMap.set(d, []);
      }
      historyMap.get(d)!.push(order);
    }

    const history = Array.from(historyMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, list]) => {
        const earned = list.reduce(
          (sum, o) => sum + (o.courierFeeAtDelivery ?? feePerOrder),
          0
        );
        return {
          date,
          deliveredCount: list.length,
          earnedAmount: earned,
          orders: list.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            deliveredAt: o.deliveredAt || o.updatedAt,
            total: o.total,
            isPaid: !!o.courierPaid,
          })),
        };
      });

    return {
      feePerOrder,
      today: {
        deliveredCount: todayDelivered.length,
        earnedAmount: todayDelivered.reduce(
          (sum, o) => sum + (o.courierFeeAtDelivery ?? feePerOrder),
          0
        ),
      },
      unpaid: {
        ordersCount: unpaidOrders.length,
        amount: unpaidAmount,
      },
      paid: {
        totalPaidAmount,
        payouts,
      },
      history,
    };
  }

  // Get dues summary for Admin / Manager
  getCourierDuesSummary(): CourierDuesSummary {
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' }).format(new Date());

    const allDelivered = this.orders.filter((o) => o.status === 'DELIVERED');
    const todayDelivered = allDelivered.filter((o) => {
      const d = o.deliveredAt || o.updatedAt || o.createdAt;
      return d.slice(0, 10) === todayStr;
    });

    let totalDeliveryDues = 0;
    let todayDeliveryDues = 0;
    let totalUnpaidDues = 0;
    let totalPaidDues = 0;

    const couriers: CourierDueItem[] = this.deliveryPeople.map((dp) => {
      const feePerOrder = dp.deliveryFeePerOrder ?? this.restaurant.defaultCourierFeePerOrder ?? 100;
      const driverDelivered = allDelivered.filter((o) => o.deliveryPersonId === dp.id);

      const driverToday = driverDelivered.filter((o) => {
        const d = o.deliveredAt || o.updatedAt || o.createdAt;
        return d.slice(0, 10) === todayStr;
      });

      const driverUnpaid = driverDelivered.filter((o) => !o.courierPaid);
      const unpaidAmount = driverUnpaid.reduce(
        (sum, o) => sum + (o.courierFeeAtDelivery ?? feePerOrder),
        0
      );

      const driverPayouts = this.courierPayouts.filter((p) => p.deliveryPersonId === dp.id);
      const paidAmount = driverPayouts.reduce((sum, p) => sum + p.amount, 0);
      const totalEarned = paidAmount + unpaidAmount;

      const driverTodayDues = driverToday.reduce(
        (sum, o) => sum + (o.courierFeeAtDelivery ?? feePerOrder),
        0
      );

      totalDeliveryDues += totalEarned;
      todayDeliveryDues += driverTodayDues;
      totalUnpaidDues += unpaidAmount;
      totalPaidDues += paidAmount;

      let status: 'PAID' | 'UNPAID' | 'PARTIAL' = 'PAID';
      if (unpaidAmount > 0 && paidAmount > 0) status = 'PARTIAL';
      else if (unpaidAmount > 0) status = 'UNPAID';

      return {
        deliveryPersonId: dp.id,
        deliveryPersonName: dp.name,
        phone: dp.phone,
        feePerOrder,
        todayDeliveredCount: driverToday.length,
        totalDeliveredCount: driverDelivered.length,
        unpaidDeliveredCount: driverUnpaid.length,
        unpaidAmount,
        paidAmount,
        totalEarned,
        status,
      };
    });

    return {
      todayDeliveredCount: todayDelivered.length,
      todayDeliveryDues,
      deliveredOrdersCount: allDelivered.length,
      totalDeliveryDues,
      unpaidDues: totalUnpaidDues,
      paidDues: totalPaidDues,
      couriers,
      recentPayouts: [...this.courierPayouts].sort(
        (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
      ),
    };
  }

  // Record payout to courier
  recordCourierPayout(deliveryPersonId: string, notes?: string): CourierPayout {
    const dp = this.deliveryPeople.find((p) => p.id === deliveryPersonId);
    if (!dp) {
      throw new Error('عامل التوصيل غير موجود');
    }

    const feePerOrder = dp.deliveryFeePerOrder ?? this.restaurant.defaultCourierFeePerOrder ?? 100;

    const unpaidOrders = this.orders.filter(
      (o) => o.deliveryPersonId === deliveryPersonId && o.status === 'DELIVERED' && !o.courierPaid
    );

    if (unpaidOrders.length === 0) {
      throw new Error('لا توجد مستحقات معلقة غير مدفوعة لهذا المندوب لتسويتها');
    }

    const amount = unpaidOrders.reduce(
      (sum, o) => sum + (o.courierFeeAtDelivery ?? feePerOrder),
      0
    );

    const payout: CourierPayout = {
      id: `pay-${Date.now().toString().slice(-6)}`,
      restaurantId: this.restaurant.id,
      deliveryPersonId: dp.id,
      deliveryPersonName: dp.name,
      ordersCount: unpaidOrders.length,
      orderIds: unpaidOrders.map((o) => o.id),
      amount,
      feePerOrder,
      status: 'PAID',
      paidAt: new Date().toISOString(),
      notes: notes?.trim() || 'تسوية مستحقات التوصيل',
      createdAt: new Date().toISOString(),
    };

    for (const order of unpaidOrders) {
      order.courierPaid = true;
      order.courierPayoutId = payout.id;
      if (order.courierFeeAtDelivery === undefined) {
        order.courierFeeAtDelivery = feePerOrder;
      }
      order.updatedAt = new Date().toISOString();
    }

    this.courierPayouts.push(payout);
    console.log(`[DatabaseStore] Recorded payout ${payout.id} of ${amount} DZD to ${dp.name}`);
    return JSON.parse(JSON.stringify(payout));
  }
}

export const dbStore = new DatabaseStore();

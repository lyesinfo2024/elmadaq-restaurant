import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import type {
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
  FinancePeriod,
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

// File path for the permanent SQLite database
const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'restaurant.sqlite');

export class SQLiteDatabaseStore {
  private db!: DatabaseSync;
  private idempotencyCache = new Map<string, { order: Order; timestamp: number }>();
  private isInitialized = false;

  constructor() {
    // Ensure directory exists with secure permissions
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true, mode: 0o700 });
    }
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    // Connect to SQLite file
    this.db = new DatabaseSync(DB_FILE);

    // Enable WAL mode for high performance & safe concurrency, and foreign keys
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA synchronous = NORMAL;');

    // 1. Create tables
    this.createTables();

    // 2. Seed initial essential data if table is empty
    await this.seedInitialDataIfEmpty();

    this.isInitialized = true;
    console.log(`[SQLiteDatabaseStore] Connected to persistent SQLite database at: ${DB_FILE}`);
  }

  private createTables(): void {
    this.db.exec(`
      -- 1. Restaurant Settings
      CREATE TABLE IF NOT EXISTS restaurant (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        description TEXT,
        logo_url TEXT,
        cover_image_url TEXT,
        phone TEXT NOT NULL,
        email TEXT,
        wilaya TEXT NOT NULL,
        commune TEXT NOT NULL,
        address TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'دج',
        currency_code TEXT NOT NULL DEFAULT 'DZD',
        is_open INTEGER NOT NULL DEFAULT 1,
        opening_hours TEXT,
        timezone TEXT NOT NULL DEFAULT 'Africa/Algiers',
        default_delivery_fee INTEGER NOT NULL DEFAULT 300,
        min_order_amount INTEGER NOT NULL DEFAULT 800,
        default_courier_fee_per_order INTEGER DEFAULT 100,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- 2. Delivery Zones
      CREATE TABLE IF NOT EXISTS delivery_zones (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        wilaya TEXT NOT NULL,
        wilaya_code TEXT,
        commune TEXT NOT NULL,
        delivery_fee INTEGER NOT NULL,
        estimated_minutes INTEGER NOT NULL,
        min_order_amount INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- 3. Categories
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        icon TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- 4. Products
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        price INTEGER NOT NULL,
        image_url TEXT NOT NULL,
        is_available INTEGER NOT NULL DEFAULT 1,
        is_featured INTEGER NOT NULL DEFAULT 0,
        display_order INTEGER NOT NULL DEFAULT 0,
        preparation_time_minutes INTEGER,
        calories INTEGER,
        tags TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
      );

      -- 5. Users
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- 6. Delivery People
      CREATE TABLE IF NOT EXISTS delivery_people (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        user_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_available INTEGER NOT NULL DEFAULT 1,
        delivery_fee_per_order INTEGER NOT NULL DEFAULT 100,
        vehicle_type TEXT DEFAULT 'توصيل',
        vehicle_plate_number TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      -- 7. Orders
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT NOT NULL UNIQUE,
        restaurant_id TEXT NOT NULL,
        customer_id TEXT,
        status TEXT NOT NULL,
        order_type TEXT NOT NULL DEFAULT 'DELIVERY',
        payment_method TEXT NOT NULL,
        payment_status TEXT NOT NULL,
        subtotal INTEGER NOT NULL,
        delivery_fee INTEGER NOT NULL,
        total INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        wilaya TEXT NOT NULL,
        daira TEXT,
        commune TEXT NOT NULL,
        neighborhood TEXT NOT NULL,
        address TEXT NOT NULL,
        delivery_address TEXT,
        notes TEXT,
        delivery_person_id TEXT,
        cancellation_reason TEXT,
        delivered_at TEXT,
        courier_paid INTEGER NOT NULL DEFAULT 0,
        courier_payout_id TEXT,
        courier_fee_at_delivery INTEGER,
        idempotency_key TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (delivery_person_id) REFERENCES delivery_people (id) ON DELETE SET NULL
      );

      -- 8. Order Items
      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT,
        product_name TEXT NOT NULL,
        unit_price INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        total_price INTEGER NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
      );

      -- 9. Courier Payouts
      CREATE TABLE IF NOT EXISTS courier_payouts (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        delivery_person_id TEXT NOT NULL,
        delivery_person_name TEXT NOT NULL,
        orders_count INTEGER NOT NULL,
        order_ids_json TEXT NOT NULL,
        amount INTEGER NOT NULL,
        fee_per_order INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'PAID',
        paid_at TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (delivery_person_id) REFERENCES delivery_people (id) ON DELETE CASCADE
      );

      -- 10. Operational Indexes
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
      CREATE INDEX IF NOT EXISTS idx_orders_delivery_person ON orders (delivery_person_id);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);
      CREATE INDEX IF NOT EXISTS idx_payouts_driver ON courier_payouts (delivery_person_id);
    `);
  }

  private async seedInitialDataIfEmpty(): Promise<void> {
    // 1. Restaurant
    const restRow = this.db.prepare('SELECT id FROM restaurant LIMIT 1').get();
    if (!restRow) {
      const stmt = this.db.prepare(`
        INSERT INTO restaurant (
          id, name, slug, description, logo_url, cover_image_url,
          phone, email, wilaya, commune, address, currency, currency_code,
          is_open, opening_hours, timezone, default_delivery_fee, min_order_amount,
          default_courier_fee_per_order, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?
        )
      `);
      stmt.run(
        INITIAL_RESTAURANT.id,
        INITIAL_RESTAURANT.name,
        INITIAL_RESTAURANT.slug,
        INITIAL_RESTAURANT.description || null,
        INITIAL_RESTAURANT.logoUrl || null,
        INITIAL_RESTAURANT.coverImageUrl || null,
        INITIAL_RESTAURANT.phone,
        INITIAL_RESTAURANT.email || null,
        INITIAL_RESTAURANT.wilaya,
        INITIAL_RESTAURANT.commune,
        INITIAL_RESTAURANT.address,
        INITIAL_RESTAURANT.currency,
        INITIAL_RESTAURANT.currencyCode,
        INITIAL_RESTAURANT.isOpen ? 1 : 0,
        INITIAL_RESTAURANT.openingHours || null,
        INITIAL_RESTAURANT.timezone,
        INITIAL_RESTAURANT.defaultDeliveryFee,
        INITIAL_RESTAURANT.minOrderAmount,
        INITIAL_RESTAURANT.defaultCourierFeePerOrder ?? 100,
        INITIAL_RESTAURANT.createdAt,
        INITIAL_RESTAURANT.updatedAt
      );
    }

    // 2. Delivery Zones
    const zonesCount = (this.db.prepare('SELECT COUNT(*) as count FROM delivery_zones').get() as any).count;
    if (zonesCount === 0) {
      const stmt = this.db.prepare(`
        INSERT INTO delivery_zones (
          id, restaurant_id, wilaya, wilaya_code, commune,
          delivery_fee, estimated_minutes, min_order_amount, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const z of INITIAL_DELIVERY_ZONES) {
        stmt.run(
          z.id,
          z.restaurantId,
          z.wilaya,
          z.wilayaCode || null,
          z.commune,
          z.deliveryFee,
          z.estimatedMinutes,
          z.minOrderAmount,
          z.isActive ? 1 : 0,
          z.createdAt,
          z.updatedAt
        );
      }
    }

    // 3. Categories
    const catCount = (this.db.prepare('SELECT COUNT(*) as count FROM categories').get() as any).count;
    if (catCount === 0 && INITIAL_CATEGORIES.length > 0) {
      const stmt = this.db.prepare(`
        INSERT INTO categories (
          id, restaurant_id, name, description, image_url, icon,
          display_order, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of INITIAL_CATEGORIES) {
        stmt.run(
          c.id,
          c.restaurantId,
          c.name,
          c.description || null,
          c.imageUrl || null,
          c.icon || null,
          c.displayOrder,
          c.isActive ? 1 : 0,
          c.createdAt,
          c.updatedAt
        );
      }
    }

    // 4. Products
    const prodCount = (this.db.prepare('SELECT COUNT(*) as count FROM products').get() as any).count;
    if (prodCount === 0 && INITIAL_PRODUCTS.length > 0) {
      const stmt = this.db.prepare(`
        INSERT INTO products (
          id, restaurant_id, category_id, name, description, price,
          image_url, is_available, is_featured, display_order,
          preparation_time_minutes, calories, tags, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const p of INITIAL_PRODUCTS) {
        stmt.run(
          p.id,
          p.restaurantId,
          p.categoryId,
          p.name,
          p.description,
          p.price,
          p.imageUrl,
          p.isAvailable ? 1 : 0,
          p.isFeatured ? 1 : 0,
          p.displayOrder,
          p.preparationTimeMinutes ?? null,
          p.calories ?? null,
          p.tags || null,
          p.createdAt,
          p.updatedAt
        );
      }
    }

    // 5. Admin, Manager & Courier Users (ensure all initial users exist)
    const userStmt = this.db.prepare(`
      INSERT INTO users (
        id, restaurant_id, name, email, username, password_hash,
        phone, role, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    for (const u of INITIAL_USERS_RAW) {
      const existingUser = this.db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1').get(u.email);
      if (!existingUser) {
        const passwordHash = await bcrypt.hash(u.passwordPlain, 10);
        userStmt.run(
          u.id,
          u.restaurantId,
          u.name,
          u.email,
          u.username || u.email.split('@')[0],
          passwordHash,
          u.phone || null,
          u.role,
          u.isActive ? 1 : 0,
          now,
          now
        );
      }
    }

    // 6. Initial Delivery People (if not present)
    const dpStmt = this.db.prepare(`
      INSERT INTO delivery_people (
        id, restaurant_id, user_id, name, phone, email,
        is_active, is_available, delivery_fee_per_order, vehicle_type,
        vehicle_plate_number, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const dp of INITIAL_DELIVERY_PEOPLE) {
      const existingDp = this.db.prepare('SELECT id FROM delivery_people WHERE id = ? OR user_id = ? LIMIT 1').get(dp.id, dp.userId);
      if (!existingDp) {
        dpStmt.run(
          dp.id,
          dp.restaurantId,
          dp.userId,
          dp.name,
          dp.phone,
          dp.email || null,
          dp.isActive ? 1 : 0,
          dp.isAvailable ? 1 : 0,
          dp.deliveryFeePerOrder,
          dp.vehicleType || 'توصيل',
          dp.vehiclePlateNumber || null,
          dp.createdAt,
          dp.updatedAt
        );
      }
    }
  }

  // ==========================================
  // Restaurant Queries
  // ==========================================

  getRestaurant(): Restaurant {
    const row = this.db.prepare('SELECT * FROM restaurant LIMIT 1').get() as any;
    if (!row) throw new Error('بيانات المطعم غير مهيأة');
    return this.mapRestaurant(row);
  }

  updateRestaurant(data: Partial<Restaurant>): Restaurant {
    const current = this.getRestaurant();
    const updated: Restaurant = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    const stmt = this.db.prepare(`
      UPDATE restaurant SET
        name = ?,
        slug = ?,
        description = ?,
        logo_url = ?,
        cover_image_url = ?,
        phone = ?,
        email = ?,
        wilaya = ?,
        commune = ?,
        address = ?,
        currency = ?,
        currency_code = ?,
        is_open = ?,
        opening_hours = ?,
        timezone = ?,
        default_delivery_fee = ?,
        min_order_amount = ?,
        default_courier_fee_per_order = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.name,
      updated.slug,
      updated.description || null,
      updated.logoUrl || null,
      updated.coverImageUrl || null,
      updated.phone,
      updated.email || null,
      updated.wilaya,
      updated.commune,
      updated.address,
      updated.currency,
      updated.currencyCode,
      updated.isOpen ? 1 : 0,
      updated.openingHours || null,
      updated.timezone,
      updated.defaultDeliveryFee,
      updated.minOrderAmount,
      updated.defaultCourierFeePerOrder ?? 100,
      updated.updatedAt,
      updated.id
    );

    return updated;
  }

  // ==========================================
  // Delivery Zones Queries
  // ==========================================

  getDeliveryZones(onlyActive = true): DeliveryZone[] {
    const sql = onlyActive
      ? 'SELECT * FROM delivery_zones WHERE is_active = 1 ORDER BY delivery_fee ASC'
      : 'SELECT * FROM delivery_zones ORDER BY delivery_fee ASC';
    const rows = this.db.prepare(sql).all() as any[];
    return rows.map(this.mapDeliveryZone);
  }

  getDeliveryZoneById(id: string): DeliveryZone | null {
    const row = this.db.prepare('SELECT * FROM delivery_zones WHERE id = ?').get(id) as any;
    return row ? this.mapDeliveryZone(row) : null;
  }

  // ==========================================
  // Category Queries & Management
  // ==========================================

  getCategories(onlyActive = true): Category[] {
    const sql = onlyActive
      ? 'SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC'
      : 'SELECT * FROM categories ORDER BY display_order ASC';
    const rows = this.db.prepare(sql).all() as any[];
    return rows.map(this.mapCategory);
  }

  getCategoryById(id: string): Category | null {
    const row = this.db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as any;
    return row ? this.mapCategory(row) : null;
  }

  createCategory(input: {
    name: string;
    description?: string;
    icon?: string;
    imageUrl?: string;
    displayOrder?: number;
    isActive?: boolean;
  }): Category {
    const id = `cat-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const rest = this.getRestaurant();
    const cat: Category = {
      id,
      restaurantId: rest.id,
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      icon: input.icon?.trim() || '🍽️',
      imageUrl: input.imageUrl?.trim() || undefined,
      displayOrder: input.displayOrder ?? 99,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO categories (
        id, restaurant_id, name, description, image_url, icon,
        display_order, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      cat.id,
      cat.restaurantId,
      cat.name,
      cat.description || null,
      cat.imageUrl || null,
      cat.icon || null,
      cat.displayOrder,
      cat.isActive ? 1 : 0,
      cat.createdAt,
      cat.updatedAt
    );

    return cat;
  }

  deleteCategory(id: string): boolean {
    const cat = this.getCategoryById(id);
    if (!cat) return false;
    // Unlink product_id from order_items for all products in this category to preserve past orders
    const prods = this.db.prepare('SELECT id FROM products WHERE category_id = ?').all(id) as any[];
    for (const p of prods) {
      this.db.prepare('UPDATE order_items SET product_id = NULL WHERE product_id = ?').run(p.id);
    }
    // Delete products under this category
    this.db.prepare('DELETE FROM products WHERE category_id = ?').run(id);
    // Delete the category itself
    const res = this.db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return res.changes > 0;
  }

  // ==========================================
  // Product Queries & Management
  // ==========================================

  getProducts(filter?: {
    categoryId?: string;
    isAvailableOnly?: boolean;
    search?: string;
    isFeaturedOnly?: boolean;
  }): Product[] {
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params: any[] = [];

    if (filter?.categoryId) {
      sql += ' AND category_id = ?';
      params.push(filter.categoryId);
    }
    if (filter?.isAvailableOnly) {
      sql += ' AND is_available = 1';
    }
    if (filter?.isFeaturedOnly) {
      sql += ' AND is_featured = 1';
    }
    if (filter?.search) {
      const q = `%${filter.search.toLowerCase().trim()}%`;
      sql += ' AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(tags) LIKE ?)';
      params.push(q, q, q);
    }

    sql += ' ORDER BY display_order ASC';
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(this.mapProduct);
  }

  getProductById(id: string): Product | null {
    const row = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
    return row ? this.mapProduct(row) : null;
  }

  createProduct(input: {
    categoryId: string;
    name: string;
    description: string;
    price: number;
    imageUrl?: string;
    isAvailable?: boolean;
    isFeatured?: boolean;
    displayOrder?: number;
    preparationTimeMinutes?: number;
    calories?: number;
    tags?: string;
  }): Product {
    const id = `prod-dz-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const rest = this.getRestaurant();

    // Verify category exists
    const cat = this.getCategoryById(input.categoryId);
    if (!cat) {
      throw new Error('التصنيف المحدد غير موجود');
    }

    const prod: Product = {
      id,
      restaurantId: rest.id,
      categoryId: input.categoryId,
      name: input.name.trim(),
      description: input.description.trim(),
      price: Math.max(0, Math.round(Number(input.price))),
      imageUrl: input.imageUrl?.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      isAvailable: input.isAvailable ?? true,
      isFeatured: input.isFeatured ?? false,
      displayOrder: input.displayOrder ?? 99,
      preparationTimeMinutes: input.preparationTimeMinutes ?? 15,
      calories: input.calories ?? undefined,
      tags: input.tags?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO products (
        id, restaurant_id, category_id, name, description, price,
        image_url, is_available, is_featured, display_order,
        preparation_time_minutes, calories, tags, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      prod.id,
      prod.restaurantId,
      prod.categoryId,
      prod.name,
      prod.description,
      prod.price,
      prod.imageUrl,
      prod.isAvailable ? 1 : 0,
      prod.isFeatured ? 1 : 0,
      prod.displayOrder,
      prod.preparationTimeMinutes ?? null,
      prod.calories ?? null,
      prod.tags || null,
      prod.createdAt,
      prod.updatedAt
    );

    return prod;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | null {
    const prod = this.getProductById(id);
    if (!prod) return null;

    const updated: Product = {
      ...prod,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const stmt = this.db.prepare(`
      UPDATE products SET
        category_id = ?,
        name = ?,
        description = ?,
        price = ?,
        image_url = ?,
        is_available = ?,
        is_featured = ?,
        display_order = ?,
        preparation_time_minutes = ?,
        calories = ?,
        tags = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.categoryId,
      updated.name,
      updated.description,
      updated.price,
      updated.imageUrl,
      updated.isAvailable ? 1 : 0,
      updated.isFeatured ? 1 : 0,
      updated.displayOrder,
      updated.preparationTimeMinutes ?? null,
      updated.calories ?? null,
      updated.tags || null,
      updated.updatedAt,
      id
    );

    return updated;
  }

  deleteProduct(id: string): boolean {
    const prod = this.getProductById(id);
    if (!prod) return false;
    // Unlink product_id from order_items safely so historical orders are preserved
    this.db.prepare('UPDATE order_items SET product_id = NULL WHERE product_id = ?').run(id);
    const res = this.db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return res.changes > 0;
  }

  // ==========================================
  // User Queries & Authentication
  // ==========================================

  getUserByEmail(email: string): User | null {
    return this.getUserByEmailOrUsername(email);
  }

  getUserByEmailOrUsername(identifier: string): User | null {
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase();
    const cleanUsername = clean.includes('@') ? clean.split('@')[0] : clean;

    const row = this.db.prepare(`
      SELECT * FROM users
      WHERE LOWER(email) = ?
         OR LOWER(username) = ?
         OR phone = ?
         OR LOWER(username) = ?
      LIMIT 1
    `).get(clean, clean, identifier.trim(), cleanUsername) as any;

    return row ? this.mapUser(row) : null;
  }

  getUserById(id: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    return row ? this.mapUser(row) : null;
  }

  toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username || user.email.split('@')[0],
      phone: user.phone,
      role: user.role,
      restaurantId: user.restaurantId,
      isActive: user.isActive,
    };
  }

  // ==========================================
  // Orders Engine (SQLite Atomic Transaction)
  // ==========================================

  async createOrder(input: CreateOrderInput): Promise<Order> {
    // 1. Idempotency Check
    if (input.idempotencyKey) {
      const cached = this.idempotencyCache.get(input.idempotencyKey);
      if (cached && Date.now() - cached.timestamp < 120000) {
        return cached.order;
      }
    }

    // 2. Validation
    if (!input.customerName || typeof input.customerName !== 'string' || input.customerName.trim().length === 0) {
      throw new Error('يرجى إدخال اسم الزبون الكريم');
    }
    if (!input.customerPhone || !isValidAlgerianPhone(input.customerPhone)) {
      throw new Error('رقم هاتف جزائري غير صالح، يجب أن يبدأ بـ 05 أو 06 أو 07 ويتكون من 10 أرقام');
    }
    if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
      throw new Error('سلة الطلب فارغة، يرجى اختيار وجبة واحدة على الأقل');
    }
    if (!input.deliveryZoneId) {
      throw new Error('يرجى اختيار منطقة وبلدية التوصيل');
    }

    const zone = this.getDeliveryZoneById(input.deliveryZoneId);
    if (!zone || !zone.isActive) {
      throw new Error('منطقة التوصيل المختارة غير صالحة أو غير نشطة حالياً');
    }

    // 3. ATOMIC VERIFICATION & SECURE CALCULATION FROM DATABASE
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const orderItems: OrderItem[] = [];
    let calculatedSubtotal = 0;

    for (const itemInput of input.items) {
      if (!itemInput.productId) {
        throw new Error('معرف الوجبة مفقود في الطلب');
      }

      const dbProduct = this.getProductById(itemInput.productId);
      if (!dbProduct) {
        throw new Error(`الوجبة المطلوبة (المعرف: ${itemInput.productId}) غير موجودة في قائمة المطعم`);
      }
      if (!dbProduct.isAvailable) {
        throw new Error(`نعتذر، الوجبة "${dbProduct.name}" غير متوفرة حالياً في المطبخ`);
      }

      const quantity = Number(itemInput.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error(`الكمية المحددة للوجبة "${dbProduct.name}" يجب أن تكون عدداً صحيحاً أكبر من صفر`);
      }

      const unitPrice = dbProduct.price;
      const itemTotalPrice = unitPrice * quantity;
      calculatedSubtotal += itemTotalPrice;

      orderItems.push({
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        orderId,
        productId: dbProduct.id,
        productName: dbProduct.name,
        unitPrice,
        quantity,
        totalPrice: itemTotalPrice,
        notes: itemInput.notes?.trim() || undefined,
        createdAt: new Date().toISOString(),
      });
    }

    if (calculatedSubtotal < zone.minOrderAmount) {
      throw new Error(
        `الحد الأدنى للطلب لمنطقة "${zone.commune}" هو ${zone.minOrderAmount} دج. مجموع وجباتك الحالي هو ${calculatedSubtotal} دج`
      );
    }

    const deliveryFee = zone.deliveryFee;
    const finalTotal = calculatedSubtotal + deliveryFee;

    // Get next order counter atomically from SQLite
    const maxOrderRow = this.db.prepare(`
      SELECT order_number FROM orders ORDER BY rowid DESC LIMIT 1
    `).get() as any;

    let nextCounter = 1001;
    if (maxOrderRow?.order_number) {
      const parsed = parseInt(maxOrderRow.order_number.replace('#', ''), 10);
      if (!isNaN(parsed)) {
        nextCounter = parsed + 1;
      }
    }
    const orderNumber = `#${nextCounter}`;
    const now = new Date().toISOString();
    const rest = this.getRestaurant();

    // 4. Save into SQLite within an atomic transaction
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const orderStmt = this.db.prepare(`
        INSERT INTO orders (
          id, order_number, restaurant_id, status, order_type,
          payment_method, payment_status, subtotal, delivery_fee, total,
          customer_name, customer_phone, wilaya, daira, commune, neighborhood,
          address, delivery_address, notes, idempotency_key, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )
      `);

      orderStmt.run(
        orderId,
        orderNumber,
        rest.id,
        'NEW',
        'DELIVERY',
        input.paymentMethod || 'CASH_ON_DELIVERY',
        'UNPAID',
        calculatedSubtotal,
        deliveryFee,
        finalTotal,
        input.customerName.trim(),
        input.customerPhone.trim(),
        input.wilaya.trim(),
        input.daira?.trim() || null,
        input.commune.trim(),
        input.neighborhood.trim(),
        input.address?.trim() || input.neighborhood.trim(),
        input.address?.trim() || input.neighborhood.trim() || null,
        input.notes?.trim() || null,
        input.idempotencyKey || null,
        now,
        now
      );

      const itemStmt = this.db.prepare(`
        INSERT INTO order_items (
          id, order_id, product_id, product_name, unit_price,
          quantity, total_price, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of orderItems) {
        itemStmt.run(
          item.id,
          item.orderId,
          item.productId || null,
          item.productName,
          item.unitPrice,
          item.quantity,
          item.totalPrice,
          item.notes || null,
          item.createdAt
        );
      }

      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }

    const createdOrder = this.getOrderById(orderId)!;

    if (input.idempotencyKey) {
      this.idempotencyCache.set(input.idempotencyKey, {
        order: createdOrder,
        timestamp: Date.now(),
      });
    }

    console.log(`[SQLiteDatabaseStore] Order created successfully: ${orderNumber} for ${createdOrder.customerName}, Total: ${finalTotal} DZD`);
    return createdOrder;
  }

  getOrderById(id: string): Order | null {
    const row = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.populateOrder(row);
  }

  getOrderByNumber(num: string): Order | null {
    const cleanNum = num.trim().startsWith('#') ? num.trim() : `#${num.trim()}`;
    const row = this.db.prepare('SELECT * FROM orders WHERE LOWER(order_number) = LOWER(?)').get(cleanNum) as any;
    if (!row) return null;
    return this.populateOrder(row);
  }

  getAllOrders(): Order[] {
    const rows = this.db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all() as any[];
    return rows.map((r) => this.populateOrder(r));
  }

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

    const order = this.getOrderById(orderId);
    if (!order) {
      throw new Error('الطلب المطلوب غير موجود');
    }

    const now = new Date().toISOString();
    let paymentStatus = order.paymentStatus;
    let deliveredAt = order.deliveredAt;
    let courierFee = order.courierFeeAtDelivery;
    let courierPaid = order.courierPaid;

    if (newStatus === 'DELIVERED') {
      paymentStatus = 'PAID';
      if (!deliveredAt) deliveredAt = now;
      if (order.deliveryPersonId) {
        const dp = this.getDeliveryPersonById(order.deliveryPersonId);
        const rest = this.getRestaurant();
        const fee = dp?.deliveryFeePerOrder ?? rest.defaultCourierFeePerOrder ?? 100;
        if (courierFee === undefined) courierFee = fee;
        if (courierPaid === undefined) courierPaid = false;
      }
    }

    const stmt = this.db.prepare(`
      UPDATE orders SET
        status = ?,
        payment_status = ?,
        delivered_at = ?,
        courier_fee_at_delivery = ?,
        courier_paid = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      newStatus,
      paymentStatus,
      deliveredAt || null,
      courierFee ?? null,
      courierPaid ? 1 : 0,
      now,
      orderId
    );

    console.log(`[SQLiteDatabaseStore] Order ${order.orderNumber} status changed to ${newStatus}`);
    return this.getOrderById(orderId)!;
  }

  // ==========================================
  // Delivery Staff Management
  // ==========================================

  getAllDeliveryPeople(): DeliveryPerson[] {
    const rows = this.db.prepare('SELECT * FROM delivery_people ORDER BY created_at ASC').all() as any[];
    return rows.map((r) => this.populateDeliveryPersonStats(this.mapDeliveryPerson(r)));
  }

  getDeliveryPersonById(id: string): DeliveryPerson | null {
    const row = this.db.prepare('SELECT * FROM delivery_people WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.populateDeliveryPersonStats(this.mapDeliveryPerson(row));
  }

  getDeliveryPersonByUserId(userId: string): DeliveryPerson | null {
    const row = this.db.prepare('SELECT * FROM delivery_people WHERE user_id = ?').get(userId) as any;
    if (!row) return null;
    return this.populateDeliveryPersonStats(this.mapDeliveryPerson(row));
  }

  async createDeliveryPerson(input: CreateDeliveryPersonInput): Promise<DeliveryPerson> {
    const cleanPhone = input.phone.trim();
    if (!isValidAlgerianPhone(cleanPhone)) {
      throw new Error('رقم الهاتف غير صالح، يجب أن يكون رقم جزائري يبدأ بـ 05 أو 06 أو 07 ويتكون من 10 أرقام');
    }

    const cleanInput = (input.email || input.username || '').trim().toLowerCase();
    if (!cleanInput) {
      throw new Error('يرجى إدخال اسم المستخدم أو البريد الإلكتروني لمسؤول التوصيل');
    }

    const username = (input.username || (cleanInput.includes('@') ? cleanInput.split('@')[0] : cleanInput)).trim().toLowerCase();
    const email = cleanInput;

    // Check uniqueness in SQLite
    const existing = this.db.prepare(`
      SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1
    `).get(email, username);

    if (existing) {
      throw new Error('اسم المستخدم أو البريد الإلكتروني مسجل مسبقاً لمستخدم آخر');
    }

    if (!input.password || input.password.length < 6) {
      throw new Error('كلمة المرور يجب أن لا تقل عن 6 أحرف');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const uidSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const userId = `usr-del-dz-${uidSuffix}`;
    const dpId = `dp-${uidSuffix}`;
    const now = new Date().toISOString();
    const rest = this.getRestaurant();

    const feePerOrder = input.deliveryFeePerOrder !== undefined
      ? Math.max(0, Math.round(Number(input.deliveryFeePerOrder)))
      : (rest.defaultCourierFeePerOrder ?? 100);

    this.db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Insert user
      const userStmt = this.db.prepare(`
        INSERT INTO users (
          id, restaurant_id, name, email, username, password_hash,
          phone, role, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `);
      userStmt.run(
        userId,
        rest.id,
        input.name.trim(),
        email,
        username,
        passwordHash,
        cleanPhone,
        'DELIVERY',
        now,
        now
      );

      // 2. Insert delivery person
      const dpStmt = this.db.prepare(`
        INSERT INTO delivery_people (
          id, restaurant_id, user_id, name, phone, email,
          is_active, is_available, delivery_fee_per_order, vehicle_type,
          vehicle_plate_number, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?)
      `);
      dpStmt.run(
        dpId,
        rest.id,
        userId,
        input.name.trim(),
        cleanPhone,
        email,
        feePerOrder,
        input.vehicleType ? input.vehicleType.trim() : 'توصيل',
        input.vehiclePlateNumber?.trim() || null,
        now,
        now
      );

      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }

    console.log(`[SQLiteDatabaseStore] Created delivery person: ${input.name.trim()} (${dpId}) in SQLite`);
    return this.getDeliveryPersonById(dpId)!;
  }

  updateDeliveryPerson(id: string, input: UpdateDeliveryPersonInput): DeliveryPerson {
    const dp = this.getDeliveryPersonById(id);
    if (!dp) {
      throw new Error('عامل التوصيل غير موجود');
    }

    if (input.phone) {
      const cleanPhone = input.phone.trim();
      if (!isValidAlgerianPhone(cleanPhone)) {
        throw new Error('رقم الهاتف غير صالح، يجب أن يكون رقم جزائري 05/06/07');
      }
      dp.phone = cleanPhone;
    }

    if (input.name) dp.name = input.name.trim();
    if (input.deliveryFeePerOrder !== undefined) {
      dp.deliveryFeePerOrder = Math.max(0, Math.round(Number(input.deliveryFeePerOrder)));
    }
    if (input.vehicleType !== undefined) dp.vehicleType = input.vehicleType.trim();
    if (input.vehiclePlateNumber !== undefined) {
      dp.vehiclePlateNumber = input.vehiclePlateNumber.trim() || undefined;
    }
    if (input.isActive !== undefined) {
      dp.isActive = input.isActive;
      if (!input.isActive) dp.isAvailable = false;
    }
    if (input.isAvailable !== undefined) {
      dp.isAvailable = input.isAvailable;
    }

    const now = new Date().toISOString();

    this.db.exec('BEGIN TRANSACTION;');
    try {
      const stmt = this.db.prepare(`
        UPDATE delivery_people SET
          name = ?,
          phone = ?,
          delivery_fee_per_order = ?,
          vehicle_type = ?,
          vehicle_plate_number = ?,
          is_active = ?,
          is_available = ?,
          updated_at = ?
        WHERE id = ?
      `);
      stmt.run(
        dp.name,
        dp.phone,
        dp.deliveryFeePerOrder ?? 100,
        dp.vehicleType || 'توصيل',
        dp.vehiclePlateNumber || null,
        dp.isActive ? 1 : 0,
        dp.isAvailable ? 1 : 0,
        now,
        id
      );

      // Sync user
      const userStmt = this.db.prepare(`
        UPDATE users SET
          name = ?,
          phone = ?,
          is_active = ?,
          updated_at = ?
        WHERE id = ?
      `);
      userStmt.run(dp.name, dp.phone, dp.isActive ? 1 : 0, now, dp.userId);

      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }

    return this.getDeliveryPersonById(id)!;
  }

  deleteDeliveryPerson(id: string): DeliveryPerson {
    const dp = this.getDeliveryPersonById(id);
    if (!dp) throw new Error('مسؤول التوصيل غير موجود');

    // Check if delivery person has active/incomplete orders
    const countRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM orders
      WHERE delivery_person_id = ? AND status NOT IN ('DELIVERED', 'CANCELLED')
    `).get(id) as any;

    if (countRow?.count > 0) {
      throw new Error('لا يمكن حذف مسؤول التوصيل لأنه مرتبط بطلبات غير مكتملة. قم أولًا بمعالجة هذه الطلبات.');
    }

    // Soft delete: deactivate account
    return this.updateDeliveryPerson(id, { isActive: false, isAvailable: false });
  }

  toggleDeliveryPersonStatus(id: string): DeliveryPerson {
    const dp = this.getDeliveryPersonById(id);
    if (!dp) throw new Error('عامل التوصيل غير موجود');

    if (dp.isActive) {
      const countRow = this.db.prepare(`
        SELECT COUNT(*) as count FROM orders
        WHERE delivery_person_id = ? AND status NOT IN ('DELIVERED', 'CANCELLED')
      `).get(id) as any;

      if (countRow?.count > 0) {
        throw new Error('لا يمكن حذف مسؤول التوصيل لأنه مرتبط بطلبات غير مكتملة. قم أولًا بمعالجة هذه الطلبات.');
      }
    }

    return this.updateDeliveryPerson(id, { isActive: !dp.isActive });
  }

  setDeliveryPersonAvailability(id: string, isAvailable: boolean): DeliveryPerson {
    const dp = this.getDeliveryPersonById(id);
    if (!dp) throw new Error('عامل التوصيل غير موجود');
    if (!dp.isActive && isAvailable) {
      throw new Error('لا يمكن تفعيل التواجد لحساب معطل من قبل الإدارة');
    }
    return this.updateDeliveryPerson(id, { isAvailable });
  }

  assignOrderToDeliveryPerson(orderId: string, deliveryPersonId: string | null): Order {
    const order = this.getOrderById(orderId);
    if (!order) throw new Error('الطلب غير موجود');

    const now = new Date().toISOString();

    if (!deliveryPersonId) {
      this.db.prepare(`
        UPDATE orders SET
          delivery_person_id = NULL,
          updated_at = ?
        WHERE id = ?
      `).run(now, orderId);
      return this.getOrderById(orderId)!;
    }

    const dp = this.getDeliveryPersonById(deliveryPersonId);
    if (!dp) throw new Error('عامل التوصيل المحدد غير موجود');
    if (!dp.isActive) throw new Error('لا يمكن إسناد الطلب لعامل توصيل معطل');

    let nextStatus = order.status;
    if (nextStatus === 'NEW' || nextStatus === 'CONFIRMED') {
      nextStatus = 'READY';
    }

    this.db.prepare(`
      UPDATE orders SET
        delivery_person_id = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?
    `).run(dp.id, nextStatus, now, orderId);

    return this.getOrderById(orderId)!;
  }

  getOrdersForDeliveryPerson(deliveryPersonId: string): Order[] {
    const rows = this.db.prepare(`
      SELECT * FROM orders
      WHERE delivery_person_id = ?
      ORDER BY created_at DESC
    `).all(deliveryPersonId) as any[];

    return rows.map((r) => this.populateOrder(r));
  }

  updateDeliveryOrderStatus(
    deliveryPersonId: string,
    orderId: string,
    newStatus: OrderStatus,
    reason?: string
  ): Order {
    const order = this.getOrderById(orderId);
    if (!order) throw new Error('الطلب غير موجود');
    if (order.deliveryPersonId !== deliveryPersonId) {
      throw new Error('هذا الطلب غير مسند إليك');
    }

    const allowedStatuses: OrderStatus[] = ['READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    if (!allowedStatuses.includes(newStatus)) {
      throw new Error(`حالة غير مسموح لعامل التوصيل بتعيينها: ${newStatus}`);
    }

    const now = new Date().toISOString();
    let paymentStatus = order.paymentStatus;
    let deliveredAt = order.deliveredAt;
    let courierFee = order.courierFeeAtDelivery;
    let courierPaid = order.courierPaid;

    if (newStatus === 'DELIVERED') {
      paymentStatus = 'PAID';
      if (!deliveredAt) deliveredAt = now;
      const dp = this.getDeliveryPersonById(deliveryPersonId);
      const rest = this.getRestaurant();
      const fee = dp?.deliveryFeePerOrder ?? rest.defaultCourierFeePerOrder ?? 100;
      if (courierFee === undefined) courierFee = fee;
      if (courierPaid === undefined) courierPaid = false;
    }

    const cancellationReason = newStatus === 'CANCELLED' && reason ? reason.trim() : order.cancellationReason;

    this.db.prepare(`
      UPDATE orders SET
        status = ?,
        payment_status = ?,
        delivered_at = ?,
        courier_fee_at_delivery = ?,
        courier_paid = ?,
        cancellation_reason = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      newStatus,
      paymentStatus,
      deliveredAt || null,
      courierFee ?? null,
      courierPaid ? 1 : 0,
      cancellationReason || null,
      now,
      orderId
    );

    return this.getOrderById(orderId)!;
  }

  // ==========================================
  // Courier Dues & Finance
  // ==========================================

  getCourierDues(deliveryPersonId: string): MyCourierDues {
    const dp = this.getDeliveryPersonById(deliveryPersonId);
    if (!dp) throw new Error('عامل التوصيل غير موجود');

    const rest = this.getRestaurant();
    const feePerOrder = dp.deliveryFeePerOrder ?? rest.defaultCourierFeePerOrder ?? 100;

    const deliveredOrders = this.db.prepare(`
      SELECT * FROM orders
      WHERE delivery_person_id = ? AND status = 'DELIVERED'
      ORDER BY created_at DESC
    `).all(deliveryPersonId) as any[];

    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' }).format(new Date());

    const todayDelivered = deliveredOrders.filter((o) => {
      const d = o.delivered_at || o.updated_at || o.created_at;
      return d.slice(0, 10) === todayStr;
    });

    const unpaidOrders = deliveredOrders.filter((o) => !o.courier_paid);
    const unpaidAmount = unpaidOrders.reduce(
      (sum, o) => sum + (o.courier_fee_at_delivery ?? feePerOrder),
      0
    );

    const payoutRows = this.db.prepare(`
      SELECT * FROM courier_payouts
      WHERE delivery_person_id = ?
      ORDER BY paid_at DESC
    `).all(deliveryPersonId) as any[];

    const payouts = payoutRows.map(this.mapPayout);
    const totalPaidAmount = payouts.reduce((sum, p) => sum + p.amount, 0);

    // Group history by date
    const historyMap = new Map<string, any[]>();
    for (const order of deliveredOrders) {
      const d = (order.delivered_at || order.updated_at || order.created_at).slice(0, 10);
      if (!historyMap.has(d)) {
        historyMap.set(d, []);
      }
      historyMap.get(d)!.push(order);
    }

    const history = Array.from(historyMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, list]) => {
        const earned = list.reduce(
          (sum, o) => sum + (o.courier_fee_at_delivery ?? feePerOrder),
          0
        );
        return {
          date,
          deliveredCount: list.length,
          earnedAmount: earned,
          orders: list.map((o) => ({
            id: o.id,
            orderNumber: o.order_number,
            deliveredAt: o.delivered_at || o.updated_at,
            total: o.total,
            isPaid: !!o.courier_paid,
          })),
        };
      });

    return {
      feePerOrder,
      today: {
        deliveredCount: todayDelivered.length,
        earnedAmount: todayDelivered.reduce(
          (sum, o) => sum + (o.courier_fee_at_delivery ?? feePerOrder),
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

  getCourierDuesSummary(
    period: FinancePeriod = 'today',
    startDate?: string,
    endDate?: string
  ): CourierDuesSummary {
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' }).format(new Date());

    let rangeStart = todayStr;
    let rangeEnd = todayStr;

    if (period === 'yesterday') {
      const yesterday = new Date(Date.now() - 86400000);
      rangeStart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' }).format(yesterday);
      rangeEnd = rangeStart;
    } else if (period === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 86400000);
      rangeStart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' }).format(weekAgo);
      rangeEnd = todayStr;
    } else if (period === 'month') {
      rangeStart = `${todayStr.slice(0, 7)}-01`;
      rangeEnd = todayStr;
    } else if (period === 'custom') {
      rangeStart = startDate ? startDate.trim().slice(0, 10) : todayStr;
      rangeEnd = endDate ? endDate.trim().slice(0, 10) : todayStr;
    }

    const allOrders = this.getAllOrders();
    const periodAllOrders = allOrders.filter((o) => {
      const d = o.createdAt.slice(0, 10);
      return d >= rangeStart && d <= rangeEnd;
    });

    const allDelivered = allOrders.filter((o) => o.status === 'DELIVERED');
    const periodDelivered = allDelivered.filter((o) => {
      const d = (o.deliveredAt || o.updatedAt || o.createdAt).slice(0, 10);
      return d >= rangeStart && d <= rangeEnd;
    });

    const totalRevenue = periodDelivered.reduce((sum, o) => sum + o.total, 0);

    const todayDelivered = allDelivered.filter((o) => {
      const d = (o.deliveredAt || o.updatedAt || o.createdAt).slice(0, 10);
      return d === todayStr;
    });

    const allPayouts = (this.db.prepare('SELECT * FROM courier_payouts ORDER BY paid_at DESC').all() as any[]).map(this.mapPayout);

    let totalDeliveryDues = 0;
    let todayDeliveryDues = 0;
    let totalUnpaidDues = 0;
    let totalPaidDues = 0;

    const deliveryPeople = this.getAllDeliveryPeople();
    const rest = this.getRestaurant();

    const couriers: CourierDueItem[] = deliveryPeople.map((dp) => {
      const feePerOrder = dp.deliveryFeePerOrder ?? rest.defaultCourierFeePerOrder ?? 100;
      const driverDeliveredAll = allDelivered.filter((o) => o.deliveryPersonId === dp.id);

      const driverPeriodDelivered = periodDelivered.filter((o) => o.deliveryPersonId === dp.id);
      const periodEarned = driverPeriodDelivered.reduce(
        (sum, o) => sum + (o.courierFeeAtDelivery ?? feePerOrder),
        0
      );

      const driverToday = todayDelivered.filter((o) => o.deliveryPersonId === dp.id);
      const driverTodayDues = driverToday.reduce(
        (sum, o) => sum + (o.courierFeeAtDelivery ?? feePerOrder),
        0
      );

      const driverUnpaid = driverDeliveredAll.filter((o) => !o.courierPaid);
      const unpaidAmount = driverUnpaid.reduce(
        (sum, o) => sum + (o.courierFeeAtDelivery ?? feePerOrder),
        0
      );

      const driverPayouts = allPayouts.filter((p) => p.deliveryPersonId === dp.id);
      const paidAmount = driverPayouts.reduce((sum, p) => sum + p.amount, 0);
      const totalEarned = paidAmount + unpaidAmount;

      totalDeliveryDues += periodEarned;
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
        periodDeliveredCount: driverPeriodDelivered.length,
        periodEarned,
        todayDeliveredCount: driverToday.length,
        totalDeliveredCount: driverDeliveredAll.length,
        unpaidDeliveredCount: driverUnpaid.length,
        unpaidAmount,
        paidAmount,
        totalEarned,
        status,
      };
    });

    return {
      period,
      startDate: rangeStart,
      endDate: rangeEnd,
      totalOrdersCount: periodAllOrders.length,
      totalRevenue,
      todayDeliveredCount: todayDelivered.length,
      todayDeliveryDues,
      deliveredOrdersCount: periodDelivered.length,
      totalDeliveryDues,
      unpaidDues: totalUnpaidDues,
      paidDues: totalPaidDues,
      couriers,
      recentPayouts: allPayouts,
      deliveredOrders: periodDelivered,
    };
  }

  recordCourierPayout(deliveryPersonId: string, notes?: string): CourierPayout {
    const dp = this.getDeliveryPersonById(deliveryPersonId);
    if (!dp) throw new Error('عامل التوصيل غير موجود');

    const rest = this.getRestaurant();
    const feePerOrder = dp.deliveryFeePerOrder ?? rest.defaultCourierFeePerOrder ?? 100;

    const unpaidRows = this.db.prepare(`
      SELECT * FROM orders
      WHERE delivery_person_id = ? AND status = 'DELIVERED' AND courier_paid = 0
    `).all(deliveryPersonId) as any[];

    if (unpaidRows.length === 0) {
      throw new Error('لا توجد مستحقات معلقة غير مدفوعة لهذا المندوب لتسويتها');
    }

    const amount = unpaidRows.reduce(
      (sum, o) => sum + (o.courier_fee_at_delivery ?? feePerOrder),
      0
    );

    const payoutId = `pay-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const orderIds = unpaidRows.map((o) => o.id);

    const payout: CourierPayout = {
      id: payoutId,
      restaurantId: rest.id,
      deliveryPersonId: dp.id,
      deliveryPersonName: dp.name,
      ordersCount: unpaidRows.length,
      orderIds,
      amount,
      feePerOrder,
      status: 'PAID',
      paidAt: now,
      notes: notes?.trim() || 'تسوية مستحقات التوصيل',
      createdAt: now,
    };

    this.db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Insert payout record
      const stmt = this.db.prepare(`
        INSERT INTO courier_payouts (
          id, restaurant_id, delivery_person_id, delivery_person_name,
          orders_count, order_ids_json, amount, fee_per_order, status,
          paid_at, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        payout.id,
        payout.restaurantId,
        payout.deliveryPersonId,
        payout.deliveryPersonName,
        payout.ordersCount,
        JSON.stringify(payout.orderIds),
        payout.amount,
        payout.feePerOrder,
        payout.status,
        payout.paidAt,
        payout.notes || null,
        payout.createdAt
      );

      // 2. Mark orders as paid
      const updateOrderStmt = this.db.prepare(`
        UPDATE orders SET
          courier_paid = 1,
          courier_payout_id = ?,
          courier_fee_at_delivery = COALESCE(courier_fee_at_delivery, ?),
          updated_at = ?
        WHERE id = ?
      `);

      for (const orderId of orderIds) {
        updateOrderStmt.run(payout.id, feePerOrder, now, orderId);
      }

      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }

    console.log(`[SQLiteDatabaseStore] Recorded payout ${payout.id} of ${amount} DZD to ${dp.name} in SQLite`);
    return payout;
  }

  // ==========================================
  // Helper Mappers
  // ==========================================

  private mapRestaurant(row: any): Restaurant {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description || undefined,
      logoUrl: row.logo_url || undefined,
      coverImageUrl: row.cover_image_url || undefined,
      phone: row.phone,
      email: row.email || undefined,
      wilaya: row.wilaya,
      commune: row.commune,
      address: row.address,
      currency: row.currency,
      currencyCode: row.currency_code,
      isOpen: row.is_open === 1,
      openingHours: row.opening_hours || undefined,
      timezone: row.timezone,
      defaultDeliveryFee: row.default_delivery_fee,
      minOrderAmount: row.min_order_amount,
      defaultCourierFeePerOrder: row.default_courier_fee_per_order ?? 100,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapDeliveryZone(row: any): DeliveryZone {
    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      wilaya: row.wilaya,
      wilayaCode: row.wilaya_code || undefined,
      commune: row.commune,
      deliveryFee: row.delivery_fee,
      estimatedMinutes: row.estimated_minutes,
      minOrderAmount: row.min_order_amount,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapCategory(row: any): Category {
    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      name: row.name,
      description: row.description || undefined,
      imageUrl: row.image_url || undefined,
      icon: row.icon || undefined,
      displayOrder: row.display_order,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapProduct(row: any): Product {
    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      categoryId: row.category_id,
      name: row.name,
      description: row.description,
      price: row.price,
      imageUrl: row.image_url,
      isAvailable: row.is_available === 1,
      isFeatured: row.is_featured === 1,
      displayOrder: row.display_order,
      preparationTimeMinutes: row.preparation_time_minutes || undefined,
      calories: row.calories || undefined,
      tags: row.tags || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapUser(row: any): User {
    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      name: row.name,
      email: row.email,
      username: row.username,
      passwordHash: row.password_hash,
      phone: row.phone || undefined,
      role: row.role as any,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapDeliveryPerson(row: any): DeliveryPerson {
    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      userId: row.user_id,
      name: row.name,
      phone: row.phone,
      email: row.email || undefined,
      isActive: row.is_active === 1,
      isAvailable: row.is_available === 1,
      deliveryFeePerOrder: row.delivery_fee_per_order,
      vehicleType: row.vehicle_type || 'توصيل',
      vehiclePlateNumber: row.vehicle_plate_number || undefined,
      assignedOrdersCount: 0,
      activeOrdersCount: 0,
      completedOrdersCount: 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapPayout(row: any): CourierPayout {
    let orderIds: string[] = [];
    try {
      orderIds = JSON.parse(row.order_ids_json);
    } catch {
      orderIds = [];
    }

    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      deliveryPersonId: row.delivery_person_id,
      deliveryPersonName: row.delivery_person_name,
      ordersCount: row.orders_count,
      orderIds,
      amount: row.amount,
      feePerOrder: row.fee_per_order,
      status: 'PAID',
      paidAt: row.paid_at,
      notes: row.notes || undefined,
      createdAt: row.created_at,
    };
  }

  private populateOrder(row: any): Order {
    // Fetch items
    const itemRows = this.db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(row.id) as any[];
    const items: OrderItem[] = itemRows.map((it) => ({
      id: it.id,
      orderId: it.order_id,
      productId: it.product_id || undefined,
      productName: it.product_name,
      unitPrice: it.unit_price,
      quantity: it.quantity,
      totalPrice: it.total_price,
      notes: it.notes || undefined,
      createdAt: it.created_at,
    }));

    // Fetch delivery person summary if assigned
    let deliveryPerson: DeliveryPersonSummary | undefined = undefined;
    if (row.delivery_person_id) {
      const dpRow = this.db.prepare('SELECT * FROM delivery_people WHERE id = ?').get(row.delivery_person_id) as any;
      if (dpRow) {
        deliveryPerson = {
          id: dpRow.id,
          name: dpRow.name,
          phone: dpRow.phone,
          vehicleType: dpRow.vehicle_type || undefined,
          vehiclePlateNumber: dpRow.vehicle_plate_number || undefined,
          isAvailable: dpRow.is_available === 1,
        };
      }
    }

    return {
      id: row.id,
      orderNumber: row.order_number,
      restaurantId: row.restaurant_id,
      customerId: row.customer_id || undefined,
      status: row.status as OrderStatus,
      orderType: row.order_type as any,
      paymentMethod: row.payment_method as any,
      paymentStatus: row.payment_status as any,
      subtotal: row.subtotal,
      deliveryFee: row.delivery_fee,
      total: row.total,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      wilaya: row.wilaya,
      daira: row.daira || undefined,
      commune: row.commune,
      neighborhood: row.neighborhood,
      address: row.address,
      deliveryAddress: row.delivery_address || undefined,
      notes: row.notes || undefined,
      deliveryPersonId: row.delivery_person_id || undefined,
      deliveryPerson,
      cancellationReason: row.cancellation_reason || undefined,
      deliveredAt: row.delivered_at || undefined,
      courierPaid: row.courier_paid === 1,
      courierPayoutId: row.courier_payout_id || undefined,
      courierFeeAtDelivery: row.courier_fee_at_delivery ?? undefined,
      items,
      idempotencyKey: row.idempotency_key || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private populateDeliveryPersonStats(dp: DeliveryPerson): DeliveryPerson {
    const orders = this.db.prepare(`
      SELECT status FROM orders WHERE delivery_person_id = ?
    `).all(dp.id) as any[];

    const assignedCount = orders.length;
    const activeCount = orders.filter((o) =>
      ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status)
    ).length;
    const completedCount = orders.filter((o) => o.status === 'DELIVERED').length;

    return {
      ...dp,
      assignedOrdersCount: assignedCount,
      activeOrdersCount: activeCount,
      completedOrdersCount: completedCount,
    };
  }
}

// Export singleton instance as dbStore
export const dbStore = new SQLiteDatabaseStore();

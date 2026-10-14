import type { Restaurant, Category, Product, DeliveryZone, Role } from '../types/index.ts';

export const INITIAL_RESTAURANT: Restaurant = {
  id: 'rest-dz-001',
  name: 'مطعم ومشاوي البهجة العاصمي',
  slug: 'elbahdja-alger',
  description: 'نقدم لكم أشهى المشاوي على الفحم، والشاورما الجزائرية الأصيلة بخبز الصاج، والطاكوس العاصمي والبرغر الطازج، وبيتزا الفرن التقليدي مع خدمة التوصيل السريع والدفع عند الاستلام.',
  logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=240&h=240&q=80',
  coverImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
  phone: '0550 12 34 56',
  email: 'contact@elbahdja.dz',
  
  // العنوان الجزائري
  wilaya: 'الجزائر العاصمة (16)',
  commune: 'سيدي امحمد',
  address: '14 شارع ديدوش مراد، قرب ساحة أول ماي، سيدي امحمد، الجزائر العاصمة',
  
  currency: 'دج',
  currencyCode: 'DZD',
  isOpen: true,
  openingHours: 'يومياً من 11:30 صباحاً إلى 23:30 ليلاً بتوقيت الجزائر',
  timezone: 'Africa/Algiers',
  
  defaultDeliveryFee: 300, // 300 دج
  minOrderAmount: 800,     // 800 دج
  defaultCourierFeePerOrder: 100, // 100 دج أجرة التوصيل الافتراضية لكل طلب للمندوب
  
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const INITIAL_DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: 'zone-01',
    restaurantId: 'rest-dz-001',
    wilaya: 'إليزي',
    wilayaCode: '33',
    commune: 'إليزي',
    deliveryFee: 100, // 100 دج
    estimatedMinutes: 30,
    minOrderAmount: 200,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'zone-02',
    restaurantId: 'rest-dz-001',
    wilaya: 'إليزي',
    wilayaCode: '33',
    commune: 'إليزي (الحي الجامعي)',
    deliveryFee: 100, // 100 دج
    estimatedMinutes: 20,
    minOrderAmount: 200,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_CATEGORIES: Category[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_USERS_RAW = [
  {
    id: 'usr-admin-dz-01',
    restaurantId: 'rest-dz-001',
    name: 'أمين بن علي',
    email: 'admin@elbahdja.dz',
    username: 'admin',
    passwordPlain: 'Admin@123456',
    phone: '0550123456',
    role: 'ADMIN' as Role,
    isActive: true,
  },
  {
    id: 'usr-mgr-dz-01',
    restaurantId: 'rest-dz-001',
    name: 'ياسمين بلقاسم',
    email: 'manager@elbahdja.dz',
    username: 'manager',
    passwordPlain: 'Manager@123456',
    phone: '0661234567',
    role: 'MANAGER' as Role,
    isActive: true,
  },
];

export const INITIAL_DELIVERY_PEOPLE: any[] = [];


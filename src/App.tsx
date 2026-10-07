import { useState, useEffect, useMemo } from 'react';
import { RestaurantProvider, useRestaurant } from './frontend/context/RestaurantContext.tsx';
import { CartProvider } from './frontend/context/CartContext.tsx';
import { AuthProvider, useAuth } from './frontend/context/AuthContext.tsx';
import { Category, Product, Order } from './frontend/types/index.ts';
import { api } from './frontend/services/api.ts';
import { Header } from './frontend/components/Header.tsx';
import { Hero } from './frontend/components/Hero.tsx';
import { CategoryFilter } from './frontend/components/CategoryFilter.tsx';
import { SearchBar } from './frontend/components/SearchBar.tsx';
import { ProductCard } from './frontend/components/ProductCard.tsx';
import { ProductDetailModal } from './frontend/components/ProductDetailModal.tsx';
import { CartDrawer } from './frontend/components/CartDrawer.tsx';
import { CheckoutModal } from './frontend/components/CheckoutModal.tsx';
import { OrderSuccessModal } from './frontend/components/OrderSuccessModal.tsx';
import { OrderTrackerModal } from './frontend/components/OrderTrackerModal.tsx';
import { AdminLoginModal } from './frontend/components/AdminLoginModal.tsx';
import { AdminDashboard } from './frontend/components/AdminDashboard.tsx';
import { DeliveryDashboard } from './frontend/components/DeliveryDashboard.tsx';
import { formatAlgerianPhone } from './frontend/utils/formatters.ts';
import { Utensils, Sparkles, Phone, MapPin, ShieldCheck, Heart, Banknote, Search, Bike } from 'lucide-react';

function RestaurantApp() {
  const { restaurant } = useRestaurant();
  const { isAuthenticated, user, isDelivery } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);

  // Filtering states
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Panels
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isDeliveryDashboardOpen, setIsDeliveryDashboardOpen] = useState(false);

  // Phase 2 Order Modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);

  // Fetch categories and products from REST API
  useEffect(() => {
    async function loadMenuData() {
      try {
        setLoadingMenu(true);
        setMenuError(null);

        const [cats, prods] = await Promise.all([
          api.getCategories(),
          api.getProducts({ all: true }),
        ]);

        setCategories(cats);
        setProducts(prods);
      } catch (err: unknown) {
        console.error('Failed to load menu data:', err);
        setMenuError(err instanceof Error ? err.message : 'فشل في تحميل قائمة الوجبات');
      } finally {
        setLoadingMenu(false);
      }
    }

    loadMenuData();
  }, []);

  // Filter products client-side for immediate responsiveness
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Category match
      if (selectedCategoryId && prod.categoryId !== selectedCategoryId) {
        return false;
      }

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = prod.name.toLowerCase().includes(q);
        const matchesDesc = prod.description.toLowerCase().includes(q);
        const matchesTags = prod.tags?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [products, selectedCategoryId, searchQuery]);

  const activeCategoryName = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId)?.name
    : 'جميع الوجبات والأطباق';

  const handleOrderSuccess = (order: Order) => {
    setCreatedOrder(order);
    setIsSuccessOpen(true);
  };

  const handleTrackCreatedOrder = (order: Order) => {
    setCreatedOrder(order);
    setIsTrackerOpen(true);
  };

  const handleLoginSuccess = () => {
    try {
      const saved = localStorage.getItem('auth_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'DELIVERY') {
          setIsDeliveryDashboardOpen(true);
          return;
        }
      }
    } catch {
      // ignore
    }
    setIsDashboardOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 selection:bg-amber-500 selection:text-white">
      {/* Header */}
      <Header
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenDashboard={() => (isDelivery ? setIsDeliveryDashboardOpen(true) : setIsDashboardOpen(true))}
        onOpenTracker={() => setIsTrackerOpen(true)}
        onOpenDelivery={() => setIsDeliveryDashboardOpen(true)}
      />

      {/* Hero Section */}
      <Hero />

      {/* Main Menu Section */}
      <main id="menu-section" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>قائمة الوجبات الطازجة • الأسعار بالدينار الجزائري</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              {activeCategoryName}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              اختر وجبتك المفضلة واستمتع بمذاق جزائري أصيل ومكونات طازجة يومياً مع خدمة التوصيل
            </p>
          </div>

          {/* Search Bar */}
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="ابحث عن شاورما، مشاوي، طاكوس، برغر..."
          />
        </div>

        {/* Categories Bar */}
        <div className="mb-8">
          <CategoryFilter
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            loading={loadingMenu}
          />
        </div>

        {/* Loading State */}
        {loadingMenu && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className="bg-white rounded-3xl border border-stone-200 p-4 space-y-4 animate-pulse"
              >
                <div className="aspect-4/3 bg-stone-200 rounded-2xl w-full" />
                <div className="h-4 bg-stone-200 rounded-md w-3/4" />
                <div className="h-3 bg-stone-200 rounded-md w-1/2" />
                <div className="h-8 bg-stone-200 rounded-xl w-full mt-4" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {menuError && !loadingMenu && (
          <div className="text-center py-16 px-4 bg-red-50 rounded-3xl border border-red-200 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Utensils className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-red-900 mb-1">تعذر تحميل قائمة الوجبات</h3>
            <p className="text-xs text-red-700 mb-4">{menuError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Products Grid */}
        {!loadingMenu && !menuError && (
          <>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-stone-300 max-w-md mx-auto">
                <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                  <Utensils className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-stone-800 mb-1">لا توجد وجبات تطابق بحثك</h3>
                <p className="text-xs text-stone-500 mb-4">
                  جرب البحث بكلمات أخرى أو اختر تصنيفاً آخر من القائمة أعلاه.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategoryId(null);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800"
                >
                  إعادة ضبط الفلاتر
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onOpenDetails={setActiveProduct}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Algerian Restaurant Footer */}
      <footer className="mt-16 bg-stone-900 text-stone-300 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-stone-800 text-xs">
            {/* Column 1: Restaurant Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                {restaurant?.logoUrl && (
                  <img
                    src={restaurant.logoUrl}
                    alt={restaurant.name}
                    className="w-8 h-8 rounded-xl object-cover"
                  />
                )}
                <span className="font-bold text-sm text-white">{restaurant?.name || 'مطعم البهجة'}</span>
              </div>
              <p className="text-stone-400 leading-relaxed max-w-xs">
                {restaurant?.description || 'أشهى المأكولات والمشاوي المحضرة بلحم طازج في قلب الجزائر العاصمة.'}
              </p>
              <div className="flex items-center gap-2 text-amber-400 font-mono" dir="ltr">
                <Phone className="w-3.5 h-3.5" />
                <span>{formatAlgerianPhone(restaurant?.phone || '0550123456')}</span>
              </div>
            </div>

            {/* Column 2: Location and Delivery */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-xs">العنوان والتوصيل في الجزائر</h4>
              <p className="text-stone-400 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>{restaurant?.address}</span>
              </p>
              <p className="text-stone-400 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>الدفع عند الاستلام نقداً (العملة: دينار جزائري DZD)</span>
              </p>
              <p className="text-stone-400">
                مواعيد العمل: {restaurant?.openingHours}
              </p>
            </div>

            {/* Column 3: Administration & Tracking */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-xs">خدمات الزبائن والإدارة</h4>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setIsTrackerOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors w-fit"
                >
                  <Search className="w-3.5 h-3.5 text-amber-400" />
                  <span>تتبع حالة طلبك برقم الطلب</span>
                </button>

                <button
                  onClick={() => {
                    if (isAuthenticated) {
                      if (isDelivery) setIsDeliveryDashboardOpen(true);
                      else setIsDashboardOpen(true);
                    } else {
                      setIsLoginModalOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 text-xs font-bold transition-colors w-fit"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>
                    {isAuthenticated
                      ? isDelivery
                        ? 'بوابة كابتن التوصيل 🛵'
                        : 'لوحة تحكم وإدارة المطعم'
                      : 'دخول إدارة المطعم'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    if (isAuthenticated && isDelivery) {
                      setIsDeliveryDashboardOpen(true);
                    } else {
                      setIsLoginModalOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-orange-400 text-xs font-bold transition-colors w-fit"
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>بوابة عمال ومندوبي التوصيل 🛵</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-stone-500">
            <div>
              © {new Date().getFullYear()} {restaurant?.name || 'مطعم البهجة'}. جميع الحقوق محفوظة • الجزائر 🇩🇿
            </div>
            <div className="flex items-center gap-1 text-stone-400">
              <span>المرحلة الثالثة: نظام التوصيل وإدارة عمال التوصيل متكامل</span>
              <Heart className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            </div>
          </div>
        </div>
      </footer>

      {/* Meal Details Modal */}
      <ProductDetailModal
        product={activeProduct}
        categories={categories}
        onClose={() => setActiveProduct(null)}
      />

      {/* Cart Drawer */}
      <CartDrawer onOpenCheckout={() => setIsCheckoutOpen(true)} />

      {/* Checkout Modal (Phase 2) */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Order Success Modal (Phase 2) */}
      <OrderSuccessModal
        isOpen={isSuccessOpen}
        order={createdOrder}
        onClose={() => setIsSuccessOpen(false)}
        onTrackOrder={handleTrackCreatedOrder}
      />

      {/* Order Tracking Modal (Phase 2) */}
      <OrderTrackerModal
        isOpen={isTrackerOpen}
        initialOrder={createdOrder}
        onClose={() => setIsTrackerOpen(false)}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      {/* Admin Dashboard */}
      {isDashboardOpen && (
        <AdminDashboard
          categories={categories}
          products={products}
          onClose={() => setIsDashboardOpen(false)}
        />
      )}

      {/* Delivery Driver Dashboard (Phase 3) */}
      {isDeliveryDashboardOpen && (
        <DeliveryDashboard onClose={() => setIsDeliveryDashboardOpen(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <RestaurantProvider>
      <CartProvider>
        <AuthProvider>
          <RestaurantApp />
        </AuthProvider>
      </CartProvider>
    </RestaurantProvider>
  );
}

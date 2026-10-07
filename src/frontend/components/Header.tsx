import { useState } from 'react';
import { ShoppingBag, UtensilsCrossed, ShieldCheck, Menu, X, Phone, Clock, Search, Bike } from 'lucide-react';
import { useRestaurant } from '../context/RestaurantContext.tsx';
import { useCart } from '../context/CartContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { formatAlgerianPhone } from '../utils/formatters.ts';

interface HeaderProps {
  onOpenLogin: () => void;
  onOpenDashboard: () => void;
  onOpenTracker: () => void;
  onOpenDelivery?: () => void;
}

export function Header({ onOpenLogin, onOpenDashboard, onOpenTracker, onOpenDelivery }: HeaderProps) {
  const { restaurant } = useRestaurant();
  const { totalItems, setIsOpen } = useCart();
  const { isAuthenticated, user, isDelivery, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-xs transition-all">
      {/* Top micro banner */}
      <div className="bg-stone-900 text-stone-200 text-xs py-1.5 px-4 hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-stone-300">
              <Phone className="w-3.5 h-3.5 text-amber-500" />
              <span dir="ltr">{formatAlgerianPhone(restaurant?.phone || '0550123456')}</span>
            </span>
            <span className="text-stone-600">|</span>
            <span className="flex items-center gap-1.5 text-stone-300">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{restaurant?.openingHours || 'يومياً: 11:30 صباحاً إلى 23:30 ليلاً'}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {restaurant?.isOpen ? 'نستقبل طلباتكم الآن (توصيل سريع)' : 'المطعم مغلق حالياً'}
            </span>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-3.5">
            {restaurant?.logoUrl ? (
              <img
                src={restaurant.logoUrl}
                alt={restaurant.name}
                className="w-12 h-12 rounded-2xl object-cover shadow-sm ring-2 ring-amber-500/20"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
            )}
            <div>
              <h1 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight leading-tight line-clamp-1">
                {restaurant?.name || 'مطعم البهجة الجزائري'}
              </h1>
              <p className="text-xs text-stone-500 line-clamp-1">
                {restaurant?.wilaya} • {restaurant?.commune}
              </p>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="#menu-section"
              className="text-stone-700 hover:text-amber-600 px-3 py-2 text-sm font-bold transition-colors"
            >
              قائمة الوجبات
            </a>

            {/* Track Order Button */}
            <button
              onClick={onOpenTracker}
              className="flex items-center gap-1.5 px-3 py-2 text-stone-700 hover:text-amber-600 text-sm font-bold transition-colors"
            >
              <Search className="w-4 h-4 text-stone-400" />
              <span>تتبع طلبك</span>
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setIsOpen(true)}
              className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-sm transition-all border border-amber-200 active:scale-95 shadow-xs"
              aria-label="عرض سلة الوجبات"
            >
              <ShoppingBag className="w-5 h-5 text-amber-600" />
              <span>السلة</span>
              {totalItems > 0 && (
                <span className="flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold text-white bg-amber-600 rounded-full animate-bounce">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Admin or Delivery Entry */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {isDelivery ? (
                  <button
                    onClick={onOpenDelivery || onOpenDashboard}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold transition-all shadow-sm active:scale-95"
                  >
                    <Bike className="w-4 h-4" />
                    <span>طلباتي 🛵</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-orange-800 text-orange-200 font-mono">
                      مندوب
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={onOpenDashboard}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold transition-all shadow-sm active:scale-95"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>لوحة الإدارة</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-stone-800 text-amber-300 font-mono">
                      {user?.role}
                    </span>
                  </button>
                )}
                <button
                  onClick={logout}
                  className="text-xs text-stone-500 hover:text-red-600 px-2 py-2 transition-colors font-medium"
                  title="تسجيل الخروج"
                >
                  خروج
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50 text-stone-700 text-sm font-semibold transition-all active:scale-95"
              >
                <ShieldCheck className="w-4 h-4 text-stone-500" />
                <span>دخول الإدارة والتوصيل</span>
              </button>
            )}
          </div>

          {/* Mobile Right Controls */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={onOpenTracker}
              className="p-2.5 rounded-xl bg-stone-100 text-stone-700 border border-stone-200"
              title="تتبع طلبك"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsOpen(true)}
              className="relative p-2.5 rounded-xl bg-amber-50 text-amber-950 border border-amber-200"
              aria-label="السلة"
            >
              <ShoppingBag className="w-5 h-5 text-amber-600" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-amber-600 rounded-full">
                  {totalItems}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50"
              aria-label="القائمة"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 pt-3 pb-5 space-y-3 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between py-2 text-xs text-stone-500 border-b border-stone-100">
            <span>حالة المطعم:</span>
            <span className="font-bold text-emerald-600">
              {restaurant?.isOpen ? 'مفتوح للطلبات والتوصيل' : 'مغلق حالياً'}
            </span>
          </div>

          <a
            href="#menu-section"
            onClick={() => setMobileMenuOpen(false)}
            className="block w-full py-2.5 text-center font-bold text-stone-800 bg-stone-100 rounded-xl hover:bg-stone-200"
          >
            تصفح قائمة الوجبات
          </a>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenTracker();
            }}
            className="w-full py-2.5 text-center font-bold text-stone-800 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl"
          >
            تتبع حالة طلبك برقم الطلب
          </button>

          {isAuthenticated ? (
            <div className="space-y-2">
              {isDelivery ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onOpenDelivery) onOpenDelivery();
                    else onOpenDashboard();
                  }}
                  className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl bg-orange-600 text-white font-bold text-sm"
                >
                  <Bike className="w-4 h-4" />
                  <span>طلباتي (المندوب) 🛵</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenDashboard();
                  }}
                  className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl bg-stone-900 text-white font-bold text-sm"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>لوحة الإدارة ({user?.role})</span>
                </button>
              )}
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2 text-center text-xs text-red-600 font-bold"
              >
                تسجيل الخروج
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenLogin();
              }}
              className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl border border-stone-300 text-stone-800 font-bold text-sm hover:bg-stone-50"
            >
              <ShieldCheck className="w-4 h-4 text-stone-500" />
              <span>تسجيل دخول الإدارة والتوصيل</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
}

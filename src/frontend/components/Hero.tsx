import { ArrowDown, Flame, Sparkles, Truck, ShieldCheck, MapPin, Banknote } from 'lucide-react';
import { useRestaurant } from '../context/RestaurantContext.tsx';

export function Hero() {
  const { restaurant } = useRestaurant();

  const scrollToMenu = () => {
    const el = document.getElementById('menu-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative overflow-hidden bg-stone-900 text-white">
      {/* Background image overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={
            restaurant?.coverImageUrl ||
            'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80'
          }
          alt="Restaurant Ambiance"
          className="w-full h-full object-cover opacity-25 filter brightness-75 scale-105 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/80 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
        <div className="max-w-3xl">
          {/* Market Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-bold mb-6 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>نظام طلبات مخصص للسوق الجزائري 🇩🇿 • الدفع عند الاستلام</span>
          </div>

          {/* Restaurant Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight sm:leading-none text-white mb-6">
            مرحباً بكم في <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500">
              {restaurant?.name || 'مطعم ومشاوي البهجة'}
            </span>
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg text-stone-300 leading-relaxed mb-8 max-w-2xl font-light">
            {restaurant?.description ||
              'نقدم لزبائننا الكرام ألذ المشاوي على الجمر، الشاورما الجزائرية، الطاكوس والبرغر والبيتزا بمكونات محلية طازجة يومياً مع خدمة التوصيل السريع إلى باب منزلك.'}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 mb-10">
            <button
              onClick={scrollToMenu}
              className="inline-flex items-center gap-3 px-7 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-base transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-amber-500/20"
            >
              <span>تصفح قائمة الوجبات</span>
              <ArrowDown className="w-5 h-5 animate-bounce" />
            </button>

            {restaurant?.address && (
              <div className="flex items-center gap-2 text-stone-300 text-xs sm:text-sm px-4 py-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="line-clamp-1">{restaurant.address}</span>
              </div>
            )}
          </div>

          {/* Algerian Market Quality Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                <Banknote className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">الدفع عند الاستلام</h4>
                <p className="text-[11px] text-stone-400 hidden sm:block">نقداً بالدينار الجزائري</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">لحوم طازجة 100%</h4>
                <p className="text-[11px] text-stone-400 hidden sm:block">لحم خروف وعجل محلي</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">توصيل لمختلف البلديات</h4>
                <p className="text-[11px] text-stone-400 hidden sm:block">أسعار توصيل مدروسة</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">نظافة وجودة معتمدة</h4>
                <p className="text-[11px] text-stone-400 hidden sm:block">أعلى معايير السلامة</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

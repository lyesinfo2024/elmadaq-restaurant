import { Product } from '../types/index.ts';
import { useCart } from '../context/CartContext.tsx';
import { formatDZD } from '../utils/formatters.ts';
import { Plus, Clock, Flame, Check } from 'lucide-react';
import { useState } from 'react';

interface ProductCardProps {
  product: Product;
  onOpenDetails: (product: Product) => void;
}

export function ProductCard({ product, onOpenDetails }: ProductCardProps) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.isAvailable) return;

    addItem(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  const tagList = product.tags ? product.tags.split(',').map((t) => t.trim()) : [];

  return (
    <div
      onClick={() => onOpenDetails(product)}
      className="group relative flex flex-col bg-white rounded-3xl border border-stone-200/80 hover:border-amber-400/60 shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer transform hover:-translate-y-1"
    >
      {/* Product Image Container */}
      <div className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {/* Gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

        {/* Top Badges */}
        <div className="absolute top-3 right-3 flex flex-wrap gap-1.5 z-10">
          {!product.isAvailable ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-900/90 text-stone-200 backdrop-blur-md">
              غير متوفر حالياً
            </span>
          ) : product.isFeatured ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-stone-950 shadow-sm">
              الأكثر طلباً ⭐
            </span>
          ) : null}

          {tagList.slice(0, 1).map((tag, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 text-stone-800 backdrop-blur-md shadow-xs"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Preparation Time Pill */}
        {product.preparationTimeMinutes && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-black/60 text-white text-[11px] font-medium backdrop-blur-md">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{product.preparationTimeMinutes} دقيقة</span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-stone-900 group-hover:text-amber-600 transition-colors line-clamp-1 mb-1.5">
            {product.name}
          </h3>

          <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed mb-4">
            {product.description}
          </p>
        </div>

        {/* Price and Add button */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between mt-auto">
          <div>
            <div className="text-lg sm:text-xl font-black text-stone-900">
              {formatDZD(product.price)}
            </div>

            {product.calories && (
              <span className="flex items-center gap-1 text-[11px] text-stone-400 font-medium">
                <Flame className="w-3 h-3 text-orange-400" />
                <span>{product.calories} سعرة</span>
              </span>
            )}
          </div>

          {/* Quick Add Button */}
          <button
            onClick={handleQuickAdd}
            disabled={!product.isAvailable}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all active:scale-95 shadow-sm ${
              !product.isAvailable
                ? 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200'
                : justAdded
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-stone-950 hover:shadow-md'
            }`}
            aria-label={`أضف ${product.name} إلى السلة`}
          >
            {justAdded ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>تمت الإضافة!</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>أضف إلى السلة</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

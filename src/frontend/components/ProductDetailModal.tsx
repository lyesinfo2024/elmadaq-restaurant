import { useState, useEffect } from 'react';
import { Product, Category } from '../types/index.ts';
import { useCart } from '../context/CartContext.tsx';
import { formatDZD } from '../utils/formatters.ts';
import { X, Plus, Minus, Clock, Flame, ShoppingBag, Check } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
}

export function ProductDetailModal({ product, categories, onClose }: ProductDetailModalProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setQuantity(1);
    setNotes('');
    setAdded(false);
  }, [product]);

  if (!product) return null;

  const category = categories.find((c) => c.id === product.categoryId);
  const tagList = product.tags ? product.tags.split(',').map((t) => t.trim()) : [];
  const totalPrice = product.price * quantity;

  const handleAddToCart = () => {
    if (!product.isAvailable) return;
    addItem(product, quantity, notes);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-20 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all active:scale-95"
          aria-label="إغلاق النافذة"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Large Product Image */}
        <div className="relative h-64 sm:h-80 w-full bg-stone-100">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-black/20" />

          {/* Badges on image */}
          <div className="absolute bottom-4 right-4 flex flex-wrap gap-2">
            {category && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-stone-950 shadow-md">
                {category.icon} {category.name}
              </span>
            )}
            {!product.isAvailable ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white shadow-md">
                غير متوفر حالياً
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-md">
                متوفر للطلب الفوري
              </span>
            )}
          </div>
        </div>

        {/* Modal Details Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[calc(85vh-20rem)] overflow-y-auto">
          <div>
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 leading-tight">
                {product.name}
              </h2>
              <div className="text-left shrink-0">
                <span className="text-2xl font-black text-amber-600">
                  {formatDZD(product.price)}
                </span>
              </div>
            </div>

            {/* Tags and Metadata */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 mb-4">
              {product.preparationTimeMinutes && (
                <span className="flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>مدة التحضير: {product.preparationTimeMinutes} دقيقة</span>
                </span>
              )}
              {product.calories && (
                <span className="flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-lg">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span>{product.calories} سعرة حرارية</span>
                </span>
              )}
            </div>

            {/* Tags */}
            {tagList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {tagList.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed bg-stone-50 p-4 rounded-2xl border border-stone-100">
              {product.description}
            </p>
          </div>

          {/* Customer Custom Notes */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              ملاحظات أو طلبات خاصة (اختياري)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: بدون هريسة، زيادة صلصة الثوم، بطاطا مقلية محمصة..."
              className="w-full px-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-6 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Quantity Selector */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-4 bg-white px-4 py-2 rounded-2xl border border-stone-200">
            <span className="text-xs font-bold text-stone-500">الكمية:</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 disabled:opacity-40 flex items-center justify-center text-stone-700 transition-colors"
                aria-label="إنقاص الكمية"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-6 text-center font-bold text-base text-stone-900">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition-colors"
                aria-label="زيادة الكمية"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={!product.isAvailable}
            className={`w-full sm:flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-3 transition-all shadow-md active:scale-98 ${
              !product.isAvailable
                ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                : added
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-500/25'
            }`}
          >
            {added ? (
              <>
                <Check className="w-5 h-5 text-white" />
                <span>تمت الإضافة بنجاح!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-5 h-5" />
                <span>أضف إلى السلة • {formatDZD(totalPrice)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

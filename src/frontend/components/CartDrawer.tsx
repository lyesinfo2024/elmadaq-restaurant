import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext.tsx';
import { useRestaurant } from '../context/RestaurantContext.tsx';
import { DeliveryZone } from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatDZD } from '../utils/formatters.ts';
import { X, Trash2, ShoppingBag, Plus, Minus, ArrowLeft, MapPin, Banknote, ShieldCheck } from 'lucide-react';

interface CartDrawerProps {
  onOpenCheckout: () => void;
}

export function CartDrawer({ onOpenCheckout }: CartDrawerProps) {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, clearCart, subtotal, totalItems } = useCart();
  const { restaurant } = useRestaurant();

  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');

  useEffect(() => {
    if (isOpen && deliveryZones.length === 0) {
      api.getDeliveryZones().then((zones) => {
        setDeliveryZones(zones);
        if (zones.length > 0) {
          setSelectedZoneId(zones[0].id);
        }
      }).catch(console.error);
    }
  }, [isOpen, deliveryZones.length]);

  if (!isOpen) return null;

  const selectedZone = deliveryZones.find((z) => z.id === selectedZoneId);
  const deliveryFee = items.length > 0 ? (selectedZone?.deliveryFee ?? restaurant?.defaultDeliveryFee ?? 300) : 0;
  const total = subtotal + deliveryFee;

  const handleProceedToCheckout = () => {
    setIsOpen(false);
    onOpenCheckout();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

      <div className="absolute inset-y-0 left-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 border-r border-stone-200">
          {/* Header */}
          <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500 text-stone-950 shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">سلة الوجبات</h3>
                <p className="text-xs text-stone-500">{totalItems} وجبات مختارة</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="p-2 text-stone-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                  title="تفريغ السلة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-stone-500 hover:text-stone-800 rounded-xl hover:bg-stone-200 transition-colors"
                aria-label="إغلاق السلة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Algerian Market Payment Badge */}
          <div className="bg-emerald-50 border-b border-emerald-200/80 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-900">
            <span className="flex items-center gap-1.5 font-bold">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>الدفع عند الاستلام (نقداً)</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-bold">
              بالدينار الجزائري DZD
            </span>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 divide-y divide-stone-100">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-700 mb-1">السلة فارغة حالياً</h4>
                  <p className="text-xs text-stone-400 max-w-xs">
                    تصفح قائمة الوجبات واختر أشهى المشاوي والسندويتشات الجزائرية لإضافتها
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 shadow-sm"
                >
                  تصفح الوجبات الآن
                </button>
              </div>
            ) : (
              items.map(({ product, quantity, notes }) => (
                <div key={product.id} className="py-4 flex gap-3.5 items-center">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-stone-200"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-stone-900 line-clamp-1">{product.name}</h4>
                    <p className="text-xs text-amber-600 font-extrabold mt-0.5">
                      {formatDZD(product.price)}
                    </p>
                    {notes && <p className="text-[11px] text-stone-400 italic line-clamp-1 mt-0.5">ملاحظة: {notes}</p>}

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-sm font-black text-stone-900 block">
                      {formatDZD(product.price * quantity)}
                    </span>
                    <button
                      onClick={() => removeItem(product.id)}
                      className="text-stone-400 hover:text-red-500 text-[11px] mt-1"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Algerian Delivery Zone Selector */}
          {items.length > 0 && deliveryZones.length > 0 && (
            <div className="px-5 py-3 border-t border-stone-200 bg-stone-50">
              <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span>اختر بلدية أو منطقة التوصيل:</span>
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:border-amber-500 font-medium"
              >
                {deliveryZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.commune} ({zone.wilaya}) — سعر التوصيل: {formatDZD(zone.deliveryFee)} (~{zone.estimatedMinutes} دقيقة)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Footer Summary with Algerian Terms */}
          {items.length > 0 && (
            <div className="p-5 border-t border-stone-200 bg-stone-50 space-y-3">
              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>مجموع الوجبات:</span>
                  <span className="font-bold text-stone-900">{formatDZD(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>سعر التوصيل:</span>
                  <span className="font-bold text-stone-900">{formatDZD(deliveryFee)}</span>
                </div>
                <div className="pt-2 border-t border-stone-200 flex justify-between text-base font-black text-stone-950">
                  <span>المجموع الإجمالي:</span>
                  <span className="text-amber-600">{formatDZD(total)}</span>
                </div>
              </div>

              <div className="text-[11px] text-stone-500 bg-stone-100 p-2.5 rounded-xl flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>المبلغ يسدد نقداً لعامل التوصيل عند استلام الوجبات ساخنة</span>
              </div>

              {/* ACTIVE CHECKOUT BUTTON */}
              <button
                onClick={handleProceedToCheckout}
                className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
              >
                <span>إتمام الطلب الآن • {formatDZD(total)}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { Category } from '../types/index.ts';
import { Layers } from 'lucide-react';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  loading?: boolean;
}

export function CategoryFilter({
  categories,
  selectedCategoryId,
  onSelectCategory,
  loading = false,
}: CategoryFilterProps) {
  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className="h-12 w-32 bg-stone-200 animate-pulse rounded-2xl shrink-0"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2.5 overflow-x-auto pb-3 pt-1 scrollbar-none px-1">
        {/* All Categories Option */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`group flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all shrink-0 shadow-xs ${
            selectedCategoryId === null
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25 scale-[1.02]'
              : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/80 hover:border-stone-300'
          }`}
        >
          <Layers className={`w-4 h-4 ${selectedCategoryId === null ? 'text-white' : 'text-stone-400 group-hover:text-amber-600'}`} />
          <span>كل الأصناف</span>
        </button>

        {/* Dynamic DB Categories */}
        {categories.map((category) => {
          const isSelected = selectedCategoryId === category.id;
          return (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className={`group flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all shrink-0 shadow-xs ${
                isSelected
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25 scale-[1.02]'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/80 hover:border-stone-300'
              }`}
            >
              {category.icon && <span className="text-base">{category.icon}</span>}
              <span>{category.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

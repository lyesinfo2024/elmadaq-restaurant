import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Restaurant } from '../types/index.ts';
import { api } from '../services/api.ts';

interface RestaurantContextType {
  restaurant: Restaurant | null;
  loading: boolean;
  error: string | null;
  reloadRestaurant: () => Promise<void>;
  updateSettings: (data: Partial<Restaurant>, token: string) => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurant = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getRestaurant();
      setRestaurant(data);
    } catch (err: unknown) {
      console.error('Error fetching restaurant:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل بيانات المطعم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurant();
  }, []);

  const updateSettings = async (data: Partial<Restaurant>, token: string) => {
    const updated = await api.updateRestaurant(data, token);
    setRestaurant(updated);
  };

  return (
    <RestaurantContext.Provider
      value={{
        restaurant,
        loading,
        error,
        reloadRestaurant: fetchRestaurant,
        updateSettings,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
}

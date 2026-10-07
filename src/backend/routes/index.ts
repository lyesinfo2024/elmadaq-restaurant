import { Router } from 'express';
import restaurantRoutes from './restaurantRoutes.ts';
import categoryRoutes from './categoryRoutes.ts';
import productRoutes from './productRoutes.ts';
import authRoutes from './authRoutes.ts';
import deliveryZoneRoutes from './deliveryZoneRoutes.ts';
import orderRoutes from './orderRoutes.ts';
import adminOrderRoutes from './adminOrderRoutes.ts';
import deliveryStaffRoutes from './deliveryStaffRoutes.ts';
import deliveryPortalRoutes from './deliveryPortalRoutes.ts';

const apiRouter = Router();

apiRouter.use('/restaurant', restaurantRoutes);
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/delivery-zones', deliveryZoneRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/admin/orders', adminOrderRoutes);
apiRouter.use('/admin/delivery-staff', deliveryStaffRoutes);
apiRouter.use('/delivery', deliveryPortalRoutes);
apiRouter.use('/auth', authRoutes);

// Health check endpoint
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    phase: 'Phase 3 - Delivery System & Driver Management (Algeria)',
    market: 'Algeria (DZ)',
    currency: 'DZD',
    timezone: 'Africa/Algiers',
    timestamp: new Date().toISOString(),
  });
});

export default apiRouter;

import { Router } from 'express';
import { getDeliveryZones, getDeliveryZoneById } from '../controllers/deliveryZoneController.ts';

const router = Router();

// GET /api/delivery-zones - جلب مناطق وأسعار التوصيل في الجزائر
router.get('/', getDeliveryZones);

// GET /api/delivery-zones/:id - جلب تفاصيل منطقة محددة
router.get('/:id', getDeliveryZoneById);

export default router;

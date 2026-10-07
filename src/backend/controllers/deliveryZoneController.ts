import { Request, Response } from 'express';
import { dbStore } from '../db/index.ts';

export async function getDeliveryZones(req: Request, res: Response) {
  try {
    const onlyActive = req.query.all !== 'true';
    const zones = dbStore.getDeliveryZones(onlyActive);
    return res.json({
      success: true,
      data: zones,
      count: zones.length,
    });
  } catch (error) {
    console.error('getDeliveryZones error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب مناطق وأسعار التوصيل',
    });
  }
}

export async function getDeliveryZoneById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const zone = dbStore.getDeliveryZoneById(id);

    if (!zone) {
      return res.status(404).json({
        success: false,
        error: 'منطقة التوصيل المطلوبة غير مسجلة',
      });
    }

    return res.json({
      success: true,
      data: zone,
    });
  } catch (error) {
    console.error('getDeliveryZoneById error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب تفاصيل منطقة التوصيل',
    });
  }
}

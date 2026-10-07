import { Request, Response } from 'express';
import { dbStore } from '../db/index.ts';

export async function getRestaurantInfo(_req: Request, res: Response) {
  try {
    const restaurant = dbStore.getRestaurant();
    return res.json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    console.error('getRestaurantInfo error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب بيانات المطعم',
    });
  }
}

export async function updateRestaurantInfo(req: Request, res: Response) {
  try {
    const updated = dbStore.updateRestaurant(req.body);
    return res.json({
      success: true,
      message: 'تم تحديث بيانات وإعدادات المطعم بنجاح',
      data: updated,
    });
  } catch (error) {
    console.error('updateRestaurantInfo error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تحديث بيانات المطعم',
    });
  }
}

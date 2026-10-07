import { Request, Response } from 'express';
import { dbStore } from '../db/index.ts';

export async function getCategories(req: Request, res: Response) {
  try {
    const onlyActive = req.query.all !== 'true';
    const categories = dbStore.getCategories(onlyActive);
    return res.json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error) {
    console.error('getCategories error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب تصنيفات الوجبات',
    });
  }
}

export async function getCategoryById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const category = dbStore.getCategoryById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'التصنيف المطلوب غير موجود',
      });
    }

    return res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('getCategoryById error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب بيانات التصنيف',
    });
  }
}

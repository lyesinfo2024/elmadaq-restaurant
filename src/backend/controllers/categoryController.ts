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

export async function createCategory(req: Request, res: Response) {
  try {
    const { name, description, icon, imageUrl, displayOrder, isActive } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'اسم التصنيف مطلوب',
      });
    }

    const newCategory = dbStore.createCategory({
      name,
      description,
      icon,
      imageUrl,
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء التصنيف بنجاح',
      data: newCategory,
    });
  } catch (error) {
    console.error('createCategory error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل في إنشاء التصنيف',
    });
  }
}


import { Request, Response } from 'express';
import { dbStore } from '../db/index.ts';

export async function getProducts(req: Request, res: Response) {
  try {
    const { categoryId, search, featured, all } = req.query;

    const products = dbStore.getProducts({
      categoryId: categoryId ? String(categoryId) : undefined,
      search: search ? String(search) : undefined,
      isFeaturedOnly: featured === 'true',
      isAvailableOnly: all !== 'true', // by default return available ones for customers
    });

    return res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    console.error('getProducts error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب قائمة الوجبات',
    });
  }
}

export async function getProductById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const product = dbStore.getProductById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'الوجبة المطلوبة غير موجودة',
      });
    }

    return res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('getProductById error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في جلب تفاصيل الوجبة',
    });
  }
}

export async function updateProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updated = dbStore.updateProduct(id, req.body);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'الوجبة المطلوبة غير موجودة',
      });
    }

    return res.json({
      success: true,
      message: 'تم تحديث الوجبة بنجاح',
      data: updated,
    });
  } catch (error) {
    console.error('updateProduct error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في تحديث بيانات الوجبة',
    });
  }
}

export async function createProduct(req: Request, res: Response) {
  try {
    const {
      categoryId,
      name,
      description,
      price,
      imageUrl,
      isAvailable,
      isFeatured,
      displayOrder,
      preparationTimeMinutes,
      calories,
      tags,
    } = req.body;

    if (!categoryId || !name || !description || price === undefined) {
      return res.status(400).json({
        success: false,
        error: 'جميع الحقول الأساسية (التصنيف، اسم الوجبة، الوصف، السعر) مطلوبة',
      });
    }

    const newProduct = dbStore.createProduct({
      categoryId,
      name,
      description,
      price: Number(price),
      imageUrl,
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : false,
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : undefined,
      preparationTimeMinutes: preparationTimeMinutes !== undefined ? Number(preparationTimeMinutes) : undefined,
      calories: calories !== undefined ? Number(calories) : undefined,
      tags,
    });

    return res.status(201).json({
      success: true,
      message: 'تم إضافة الوجبة بنجاح',
      data: newProduct,
    });
  } catch (error) {
    console.error('createProduct error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل في إضافة الوجبة',
    });
  }
}

export async function deleteProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deleted = dbStore.deleteProduct(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'الوجبة المطلوبة غير موجودة',
      });
    }
    return res.json({
      success: true,
      message: 'تم حذف الوجبة بنجاح',
    });
  } catch (error) {
    console.error('deleteProduct error:', error);
    return res.status(500).json({
      success: false,
      error: 'فشل في حذف الوجبة',
    });
  }
}



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

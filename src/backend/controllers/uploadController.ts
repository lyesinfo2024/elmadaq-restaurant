import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Upload directory for product images
const UPLOADS_BASE = path.resolve(process.cwd(), 'uploads');
const PRODUCTS_UPLOAD_DIR = path.join(UPLOADS_BASE, 'products');

// Ensure upload directory exists
if (!fs.existsSync(PRODUCTS_UPLOAD_DIR)) {
  fs.mkdirSync(PRODUCTS_UPLOAD_DIR, { recursive: true, mode: 0o755 });
}

// Memory storage to inspect file buffer before any disk write
const storage = multer.memoryStorage();

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Multer instance
export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    // Basic MIME type pre-filter
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_MIME_TYPE'));
    }
  },
}).single('image');

/**
 * Validates actual binary file content using Magic Bytes (file signatures).
 * Rejects disguised executables, scripts, or corrupt files regardless of extension or Content-Type.
 */
function detectImageExtensionFromMagicBytes(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null;

  // 1. JPEG (0xFF, 0xD8, 0xFF)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return '.jpg';
  }

  // 2. PNG (0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return '.png';
  }

  // 3. WEBP (RIFF....WEBP)
  // Bytes 0-3: 'RIFF' (0x52, 0x49, 0x46, 0x46)
  // Bytes 8-11: 'WEBP' (0x57, 0x45, 0x42, 0x50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return '.webp';
  }

  return null;
}

/**
 * Controller to handle product image upload
 */
export async function handleProductImageUpload(req: Request, res: Response): Promise<void> {
  const file = req.file;

  if (!file || !file.buffer) {
    res.status(400).json({
      success: false,
      error: 'لم يتم استلام أي ملف صورة، يرجى اختيار صورة من جهازك',
    });
    return;
  }

  // Double check file size
  if (file.buffer.length > MAX_FILE_SIZE) {
    res.status(400).json({
      success: false,
      error: 'حجم ملف الصورة يتجاوز الحد الأقصى المسموح به وهو 5 ميغابايت',
    });
    return;
  }

  // Rigorous verification of actual binary content (Magic Bytes)
  const detectedExt = detectImageExtensionFromMagicBytes(file.buffer);
  if (!detectedExt) {
    res.status(400).json({
      success: false,
      error: 'محتوى الملف غير صالح. يُسمح فقط بصور حقيقية بصيغة JPG أو PNG أو WEBP',
    });
    return;
  }

  try {
    // Generate secure, unique filename - completely decoupled from user input to prevent path traversal
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const safeFilename = `meal_${uniqueSuffix}${detectedExt}`;
    const destinationPath = path.join(PRODUCTS_UPLOAD_DIR, safeFilename);

    // Verify destination stays strictly inside PRODUCTS_UPLOAD_DIR
    const resolvedPath = path.resolve(destinationPath);
    if (!resolvedPath.startsWith(PRODUCTS_UPLOAD_DIR)) {
      res.status(400).json({
        success: false,
        error: 'مسار الملف غير آمن (محاولة اجتياز مسار)',
      });
      return;
    }

    // Write file to permanent disk
    await fs.promises.writeFile(destinationPath, file.buffer, { mode: 0o644 });

    const publicUrl = `/uploads/products/${safeFilename}`;

    console.log(`[Upload] Image successfully stored at: ${destinationPath} -> Public URL: ${publicUrl}`);

    res.status(201).json({
      success: true,
      message: 'تم رفع وحفظ صورة الوجبة بنجاح',
      imageUrl: publicUrl,
      filename: safeFilename,
      sizeBytes: file.buffer.length,
    });
  } catch (err: unknown) {
    console.error('Error saving uploaded product image:', err);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ أثناء حفظ ملف الصورة على الخادم',
    });
  }
}

/**
 * Express error handler wrapper for multer
 */
export function handleMulterErrors(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        error: 'حجم ملف الصورة يتجاوز الحد الأقصى المسموح به وهو 5 ميغابايت',
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: `خطأ في استقبال الملف: ${err.message}`,
    });
    return;
  }

  if (err instanceof Error && err.message === 'INVALID_MIME_TYPE') {
    res.status(400).json({
      success: false,
      error: 'نوع الملف غير مدعوم. الصيغ المقبولة فقط هي: JPG و PNG و WEBP',
    });
    return;
  }

  next(err);
}

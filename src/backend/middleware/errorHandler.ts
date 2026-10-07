import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  console.error('[API Error]:', err);

  const message =
    err instanceof Error ? err.message : 'حدث خطأ غير متوقع في الخادم، يرجى المحاولة لاحقاً';

  res.status(500).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  });
}

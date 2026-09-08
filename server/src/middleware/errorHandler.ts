import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('💥 Unhandled Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: env.NODE_ENV === 'production' && statusCode === 500 ? 'Something went wrong. Please try again.' : message,
      ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}

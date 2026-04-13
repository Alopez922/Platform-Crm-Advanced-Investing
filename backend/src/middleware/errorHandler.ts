import { Request, Response, NextFunction } from 'express';

// Middleware global de manejo de errores
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('❌ Error:', err.message || err);

  // Errores de Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'Ya existe un registro con esos datos únicos.',
      details: err.meta,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Registro no encontrado.',
    });
  }

  // Errores de validación Zod
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Error de validación.',
      details: err.errors,
    });
  }

  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: err.message || 'Error interno del servidor.',
  });
}

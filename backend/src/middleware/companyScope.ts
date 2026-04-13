import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// Middleware que extrae companyId de los params y verifica que la empresa existe.
// Adjunta la empresa al request para uso posterior.
export async function companyScope(req: Request, res: Response, next: NextFunction) {
  const { companyId } = req.params;

  if (!companyId) {
    return res.status(400).json({
      success: false,
      error: 'Se requiere el ID de la empresa.',
    });
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada.',
      });
    }

    if (!company.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Esta empresa está desactivada.',
      });
    }

    // Adjuntar la empresa al request para uso en controladores
    (req as any).company = company;
    next();
  } catch (error) {
    next(error);
  }
}

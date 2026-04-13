import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

// Middleware de validación genérico con Zod
// Valida body, params y/o query según los schemas proporcionados
export function validate(schemas: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    if (schemas.params) {
      req.params = schemas.params.parse(req.params) as any;
    }
    if (schemas.query) {
      req.query = schemas.query.parse(req.query) as any;
    }
    next();
  };
}

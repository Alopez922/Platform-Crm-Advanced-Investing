// Sobrescribe los tipos de Express Router Params para ser compatibles con Express 5
// En Express 5, req.params puede ser string | string[] pero en práctica siempre es string en rutas normales
import 'express';

declare module 'express-serve-static-core' {
  interface ParamsDictionary {
    [key: string]: string;
  }
}

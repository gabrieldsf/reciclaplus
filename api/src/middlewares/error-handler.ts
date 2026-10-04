import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../lib/errors.js'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      ...(err.fieldErrors.length > 0 && { errors: err.fieldErrors }),
    })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Dados inválidos',
      errors: err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    })
    return
  }

  // Corpo maior que o limite da rota (ex.: foto de perfil)
  if (typeof err === 'object' && err !== null && 'type' in err && err.type === 'entity.too.large') {
    res.status(413).json({ message: 'Arquivo muito grande' })
    return
  }

  // JSON malformado no corpo da requisição
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ message: 'JSON inválido' })
    return
  }

  console.error(err)
  res.status(500).json({ message: 'Erro interno do servidor' })
}

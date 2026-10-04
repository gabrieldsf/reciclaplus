export type FieldError = { field: string; message: string }

// Erro de negócio com status HTTP e mensagem segura para exibir ao usuário.
// `fieldErrors` aponta o campo do formulário com problema (mesmo formato dos erros do Zod).
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors: FieldError[] = [],
  ) {
    super(message)
    this.name = 'AppError'
  }
}

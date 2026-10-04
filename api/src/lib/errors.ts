export type FieldError = { field: string; message: string }

// Erro de negócio com status HTTP e mensagem segura para exibir ao usuário.
// `fieldErrors` aponta o campo do formulário com problema (mesmo formato dos erros do Zod);
// `code` é um identificador estável para o front reagir (ex.: EMAIL_NOT_VERIFIED).
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors: FieldError[] = [],
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

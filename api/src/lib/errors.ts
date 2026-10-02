// Erro de negócio com status HTTP e mensagem segura para exibir ao usuário
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

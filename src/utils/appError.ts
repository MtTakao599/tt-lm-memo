export class AppError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AppError'
  }
}

export function toUserMessage(error: unknown, fallback: string): string {
  if (error instanceof AppError) {
    return error.message
  }
  return fallback
}

export function logError(context: string, error: unknown) {
  console.error(context, error)
}

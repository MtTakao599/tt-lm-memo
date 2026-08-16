const PREFIX = '[migration]'

export function logMigration(step: string, detail: Record<string, unknown>) {
  console.log(PREFIX, step, detail)
}

export function logMigrationError(
  step: string,
  detail: Record<string, unknown>,
  error?: unknown,
) {
  console.error(PREFIX, step, detail, sanitizeUnknownError(error))
}

export function storageErrorInfo(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== 'object') {
    return { errorType: typeof error }
  }
  const record = error as {
    name?: string
    message?: string
    statusCode?: string | number
    status?: number
    error?: string
    code?: string
  }
  return {
    name: record.name ?? null,
    message: record.message ?? null,
    statusCode: record.statusCode ?? record.status ?? null,
    error: record.error ?? null,
    code: record.code ?? null,
  }
}

function sanitizeUnknownError(error: unknown): Record<string, unknown> | string {
  if (!error) {
    return 'none'
  }
  if (error instanceof Error) {
    return { name: error.name, message: error.message }
  }
  return storageErrorInfo(error)
}

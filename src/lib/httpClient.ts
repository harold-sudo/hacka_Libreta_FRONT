const API_URL = import.meta.env.VITE_BACKEND_URL ?? import.meta.env.VITE_API_URL ?? ''
let accessToken: string | null = null
export function setApiAccessToken(token: string | null) { accessToken = token }

let unauthorized: (() => void) | undefined
export function onUnauthorized(callback: () => void) { unauthorized = callback }

export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const requestToken = accessToken
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...init?.headers },
  })

  if (!response.ok) {
    if (response.status === 401 && requestToken && requestToken === accessToken && !path.startsWith('/api/auth/')) unauthorized?.()
    const text = await response.text()
    let message = text
    try {
      const error = JSON.parse(text)
      message = Array.isArray(error.message) ? error.message.join('. ') : error.message || error.error?.message || text
    } catch { /* Keep the original response for non-JSON errors. */ }
    throw new HttpError(response.status, message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const httpClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

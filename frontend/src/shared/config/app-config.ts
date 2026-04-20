function getDefaultBackendBaseUrl() {
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:8000'
  }

  const { hostname, origin, port, protocol } = window.location
  if (port === '5173') {
    return `${protocol}//${hostname}:8000`
  }

  return origin
}

export const appConfig = {
  backendBaseUrl: import.meta.env.VITE_BACKEND_BASE_URL ?? getDefaultBackendBaseUrl(),
  appMode: import.meta.env.MODE,
} as const

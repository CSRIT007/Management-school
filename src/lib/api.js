const TOKEN_KEY = 'management_token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export async function api(method, url, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!res.ok) {
    if (res.status === 401 && token && !url.includes('/api/auth/login')) {
      setToken('')
      localStorage.removeItem('management_auth')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }
    const detail =
      (data && (data.error || data.message)) ||
      text ||
      `API ${method} ${url} failed: ${res.status}`
    throw new Error(detail)
  }

  return data
}

export const get = (url) => api('GET', url)
export const post = (url, body) => api('POST', url, body)
export const put = (url, body) => api('PUT', url, body)
export const del = (url) => api('DELETE', url)

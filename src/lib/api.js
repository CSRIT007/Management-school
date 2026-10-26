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

function looksLikeHtml(text) {
  const s = String(text || '').trim().slice(0, 200).toLowerCase()
  return s.startsWith('<!doctype') || s.startsWith('<html') || s.includes('<title>')
}

function friendlyHttpError(status, data, text) {
  const fromJson = data && (data.error || data.message)
  if (fromJson && !looksLikeHtml(fromJson)) return String(fromJson)

  if (status === 502 || status === 503 || status === 504) {
    return 'Server is temporarily unavailable (bad gateway). Please try again in a few minutes, or ask IT to check the API service.'
  }
  if (status === 0 || status === 408) {
    return 'Network error. Check your internet connection and try again.'
  }
  if (status >= 500) {
    return `Server error (${status}). Please try again later.`
  }
  if (text && !looksLikeHtml(text) && text.length < 300) return text
  return `Request failed (${status}). Please try again.`
}

export async function api(method, url, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    const err = new Error('Network error. Check your internet connection and try again.')
    err.status = 0
    throw err
  }

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
    const detail = friendlyHttpError(res.status, data, text)
    const err = new Error(detail)
    err.status = res.status
    if (data?.conflicts) err.conflicts = data.conflicts
    throw err
  }

  return data
}

export const get = (url) => api('GET', url)
export const post = (url, body) => api('POST', url, body)
export const put = (url, body) => api('PUT', url, body)
export const del = (url) => api('DELETE', url)

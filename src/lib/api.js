export async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let detail = ''
    try {
      const err = await res.json()
      detail = err.error || err.message || ''
    } catch {
      detail = await res.text()
    }
    throw new Error(detail || `API ${method} ${url} failed: ${res.status}`)
  }
  return res.json()
}

export const get = (url) => api('GET', url)
export const post = (url, body) => api('POST', url, body)
export const put = (url, body) => api('PUT', url, body)
export const del = (url) => api('DELETE', url)


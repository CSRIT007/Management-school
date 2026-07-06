export async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
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


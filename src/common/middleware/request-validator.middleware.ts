import type { MiddlewareHandler } from 'hono/types'

const API_ROUTES_WITH_REQUIRED_PARAMS: Record<string, string[]> = {
  '/api/songs': ['ids', 'link'],
  '/api/albums': ['id', 'link'],
  '/api/artists': ['id', 'link'],
  '/api/playlists': ['id', 'link'],
  '/api/search/songs': ['query'],
  '/api/search/albums': ['query'],
  '/api/search/artists': ['query'],
  '/api/search/playlists': ['query'],
  '/api/search': ['query']
}

const SUSPICIOUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /union\s+select/i,
  /\.\.\/\.\.\//,
  /etc\/passwd/i,
  /proc\/self/i,
  /null\.php/i,
  /wp-admin/i,
  /wp-login/i,
  /\.env/i,
  /xmlrpc/i,
  /wp-content/i,
  /administrator/i,
  /cgi-bin/i,
  /shell/i,
  /eval\(/i,
  /base64/i
]

function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

export const requestValidator: MiddlewareHandler = async (c, next) => {
  if (c.req.method === 'OPTIONS') return next()

  const url = new URL(c.req.url)
  const path = url.pathname

  if (path.startsWith('/api/')) {
    const fullPath = path

    // Only enforce required query params on the exact routes that need them.
    // Path-param sub-routes (/api/songs/{id}, /api/artists/{id}/songs, ...)
    // carry their identifier in the path, so they must not be rejected.
    for (const [route, requiredParams] of Object.entries(API_ROUTES_WITH_REQUIRED_PARAMS)) {
      if (fullPath === route) {
        const hasAnyParam = requiredParams.some((param) => url.searchParams.has(param) && url.searchParams.get(param))
        if (!hasAnyParam) {
          return c.json(
            {
              success: false,
              message: `Missing required parameter. Provide one of: ${requiredParams.join(', ')}`
            },
            400
          )
        }
      }
    }
  }

  const rawUrl = c.req.url

  // Attackers URL-encode payloads (e.g. %20, %3C, %2F), so raw patterns miss them.
  // Also inspect the percent-decoded URL. Malformed encoding is itself rejected.
  let decodedUrl: string
  try {
    decodedUrl = decodeURIComponent(rawUrl)
  } catch {
    const ip = getClientIp(c.req.raw.headers)
    console.warn(`[SECURITY] Blocked malformed URL from ${ip}: ${path}`)
    return c.json({ success: false, message: 'Bad request' }, 400)
  }

  const isSuspicious = (input: string) => SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(input))

  if (isSuspicious(rawUrl) || isSuspicious(decodedUrl)) {
    const ip = getClientIp(c.req.raw.headers)
    console.warn(`[SECURITY] Blocked suspicious request from ${ip}: ${path}`)
    return c.json({ success: false, message: 'Bad request' }, 400)
  }

  const body = await c.req.raw
    .clone()
    .text()
    .catch(() => '')
  if (body.length > 10_000) {
    return c.json({ success: false, message: 'Request too large' }, 413)
  }

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(body)) {
      const ip = getClientIp(c.req.raw.headers)
      console.warn(`[SECURITY] Blocked suspicious body from ${ip}: ${path}`)
      return c.json({ success: false, message: 'Bad request' }, 400)
    }
  }

  await next()
}

import type { MiddlewareHandler } from 'hono/types'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key)
  }
}

function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

export const rateLimit = (opts: { windowMs: number; max: number; message?: string }): MiddlewareHandler => {
  const { windowMs, max, message = 'Too many requests, please try again later' } = opts

  return async (c, next) => {
    cleanup()

    const ip = getClientIp(c.req.raw.headers)
    const now = Date.now()
    const key = `${ip}:${c.req.path}`
    const entry = store.get(key)

    if (entry && entry.resetAt > now) {
      if (entry.count >= max) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
        c.header('Retry-After', String(retryAfter))
        c.header('X-RateLimit-Limit', String(max))
        c.header('X-RateLimit-Remaining', '0')
        c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)))
        return c.json({ success: false, message }, 429)
      }
      entry.count++
    } else {
      store.set(key, { count: 1, resetAt: now + windowMs })
    }

    const current = store.get(key)!
    c.header('X-RateLimit-Limit', String(max))
    c.header('X-RateLimit-Remaining', String(Math.max(0, max - current.count)))
    c.header('X-RateLimit-Reset', String(Math.ceil(current.resetAt / 1000)))

    await next()
  }
}

export const globalRateLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
  message: 'Rate limit exceeded. Max 60 requests per minute.'
})

export const searchRateLimit = rateLimit({
  windowMs: 60_000,
  max: 20,
  message: 'Search rate limit exceeded. Max 20 searches per minute.'
})

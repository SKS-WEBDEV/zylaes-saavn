import type { MiddlewareHandler } from 'hono/types'

const BLOCKED_IPS = new Set<string>([])

const BLOCKED_RANGES: Array<{ start: string; end: string }> = []

function ipToNumber(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  const nums = parts.map(Number)
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null
  return ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0
}

function isIpBlocked(ip: string): boolean {
  if (BLOCKED_IPS.has(ip)) return true

  const ipNum = ipToNumber(ip)
  if (ipNum === null) return false

  for (const range of BLOCKED_RANGES) {
    const start = ipToNumber(range.start)
    const end = ipToNumber(range.end)
    if (start !== null && end !== null && ipNum >= start && ipNum <= end) return true
  }

  return false
}

function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

export const ipBlocker: MiddlewareHandler = async (c, next) => {
  const ip = getClientIp(c.req.raw.headers)

  if (isIpBlocked(ip)) {
    return c.json({ success: false, message: 'Access denied' }, 403)
  }

  await next()
}

export function addBlockedIp(ip: string) {
  BLOCKED_IPS.add(ip)
}

export function removeBlockedIp(ip: string) {
  BLOCKED_IPS.delete(ip)
}

export function getBlockedIps(): string[] {
  return [...BLOCKED_IPS]
}

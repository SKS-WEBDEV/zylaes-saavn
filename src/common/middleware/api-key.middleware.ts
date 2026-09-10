import { env } from 'node:process'
import type { Context } from 'hono'
import type { MiddlewareHandler } from 'hono/types'

const runtimeKeys = new Set<string>()

interface RequestState {
  apiKey?: string
}

const state = new WeakMap<object, RequestState>()

export function getRequestApiKey(c: Context): string | undefined {
  return state.get(c)?.apiKey
}

function loadEnvKeys(): string[] {
  return (env.JIOSAAVN_API_KEYS ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter((key) => key.length > 0)
}

export function getValidApiKeys(): string[] {
  return [...new Set([...loadEnvKeys(), ...runtimeKeys])]
}

export function addApiKey(key: string): void {
  const cleaned = key.trim()
  if (cleaned) runtimeKeys.add(cleaned)
}

export function removeApiKey(key: string): void {
  runtimeKeys.delete(key.trim())
}

export function extractApiKey(c: Context): string | undefined {
  return c.req.header('x-api-key')?.trim() || c.req.query('api_key')?.trim() || undefined
}

export const apiKey: MiddlewareHandler = async (c, next) => {
  if (c.req.method === 'OPTIONS') return next()

  const validKeys = getValidApiKeys()
  if (validKeys.length === 0) return next()

  const key = extractApiKey(c)
  if (!key || !validKeys.includes(key)) {
    return c.json(
      {
        success: false,
        message: 'A valid API key is required. Pass it via the x-api-key header or the api_key query parameter.'
      },
      401
    )
  }

  state.set(c, { apiKey: key })
  await next()
}

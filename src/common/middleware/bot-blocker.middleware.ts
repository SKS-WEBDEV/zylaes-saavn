import type { MiddlewareHandler } from 'hono/types'

const BLOCKED_UA_PATTERNS = [
  /bot/i,
  /crawl/i,
  /spider/i,
  /slurp/i,
  /mediapartners/i,
  /feedly/i,
  /rss/i,
  /zoominfobot/i,
  /microsoft preview/i,
  /headlesschrome/i,
  /phantomjs/i,
  /httrack/i,
  /wget/i,
  /curl/i,
  /python-requests/i,
  /python-urllib/i,
  /go-http-client/i,
  /java\//i,
  /apache-httpclient/i,
  /scrapy/i,
  /nmap/i,
  /nikto/i,
  /masscan/i,
  /zgrab/i,
  /censys/i,
  /shodan/i,
  /netcraft/i,
  /qualys/i,
  /openvas/i,
  /sqlmap/i,
  /havij/i,
  /acunetix/i,
  /netsparker/i,
  /appscan/i,
  /w3af/i,
  /skipfish/i,
  /arachni/i,
  /whatcms/i,
  /builtwith/i,
  /wappalyzer/i,
  /goby/i,
  /riverbed/i,
  /netcraftsurveyagent/i,
  /moatbot/i,
  /googlebot/i,
  /bingbot/i,
  /yandexbot/i,
  /baiduspider/i,
  /duckduckbot/i,
  /facebot/i,
  /ia_archiver/i,
  /semrushbot/i,
  /ahrefbot/i,
  /mj12bot/i,
  /dotbot/i,
  /quivertobot/i,
  /paperlibot/i,
  /blexbot/i,
  /seekportbot/i,
  /serpstatbot/i,
  /searchmetricsbot/i,
  /petalbot/i,
  /youserpbot/i,
  /chrome-lighthouse/i,
  /pagespeed/i,
  /lighthouse/i
]

const BLOCKED_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])

export const botBlocker: MiddlewareHandler = async (c, next) => {
  if (BLOCKED_METHODS.has(c.req.method)) {
    return c.json({ success: false, message: 'Method not allowed' }, 405)
  }

  const ua = c.req.header('user-agent') || ''

  if (!ua || ua.length < 10) {
    return c.json({ success: false, message: 'Invalid request' }, 403)
  }

  for (const pattern of BLOCKED_UA_PATTERNS) {
    if (pattern.test(ua)) {
      return c.json({ success: false, message: 'Access denied' }, 403)
    }
  }

  await next()
}

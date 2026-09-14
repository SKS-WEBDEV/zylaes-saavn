# JioSaavn API

An unofficial API for downloading high-quality songs, albums, playlists, and more from [JioSaavn](https://jiosaavn.com).

This repository is a fork of [sumitkolhe/jiosaavn-api](https://github.com/sumitkolhe/jiosaavn-api) with additional request-protection middleware and optional API-key authentication.

## ✨ Features

- Search for songs, albums, artists, and playlists
- Fetch songs, albums, artists, and playlists by ID or link
- Song suggestions and artist page details
- Built-in request protection suite:
  - IP blocking
  - Optional `x-api-key` authentication with per-key rate limits
  - Bot / scanner blocking
  - Differential rate limiting (stricter for unauthenticated requests)
  - Request validation (required params, injection scan, body-size cap)
- Scalar API documentation UI and OpenAPI 3.1 spec
- Deployable to Vercel or Cloudflare Workers

## 🔐 Request Protection

Every `/api/*` request passes through the following middleware, in order:

```
ipBlocker → apiKey → botBlocker → globalRateLimit → searchRateLimit → requestValidator
```

### IP Blocker

Rejects requests from blocked IPs with `403`. Supports static IP sets, CIDR-style ranges, and runtime management.

- Client IP is resolved from `x-forwarded-for`, `x-real-ip`, or `cf-connecting-ip`.
- Runtime helpers: `addBlockedIp()`, `removeBlockedIp()`, `getBlockedIps()`.

### API Key Authentication

API-key auth is **opt-in**. When the `JIOSAAVN_API_KEYS` environment variable is not set, the API runs in **open mode** (fully backward compatible). When it is set to a comma-separated list of keys, keyed mode is enforced:

| Mode | Behavior |
| --- | --- |
| `JIOSAAVN_API_KEYS` unset | Open mode — no key required |
| `JIOSAAVN_API_KEYS` set | Missing/invalid key returns `401` |

Send the key via the `x-api-key` header or the `api_key` query parameter:

```sh
curl "https://your-deployment.vercel.app/api/songs?ids=IyXczrTw" \
  -H "x-api-key: YOUR_API_KEY"
```

```sh
curl "https://your-deployment.vercel.app/api/search/songs?query=imagine%20dragons&api_key=YOUR_API_KEY"
```

Keyed requests:

- **Bypass** bot / user-agent checks.
- Get their **own rate-limit buckets** with higher limits.

Runtime helpers: `addApiKey()`, `removeApiKey()`, `getValidApiKeys()`.

### Bot Blocker

- Methods other than `GET` and `OPTIONS` → `405`.
- Missing or very short (`< 10` chars) `User-Agent` → `403`.
- 70+ known bot, crawler, search-engine, and security-scanner `User-Agent` patterns → `403`.
- Keyed requests skip user-agent checks.

### Rate Limiting

Sliding-window rate limits, keyed per client and per path (cleaned up every 60s).

| Bucket | Unauthenticated (IP) | Authenticated (API key) |
| --- | --- | --- |
| Global (`/api/*`) | 60 req/min | 300 req/min |
| Search (`/api/search/*`) | 20 req/min | 100 req/min |

Rate-limit headers are returned on every response:

```
X-RateLimit-Limit
X-RateLimit-Remaining
X-RateLimit-Reset
```

Exceeding a limit returns `429` with a `Retry-After` header.

### Request Validator

- Required query parameters are enforced **only on exact routes** that need them (e.g. `/api/songs` needs `ids` or `link`; `/api/search/*` needs `query`). Path-param sub-routes such as `/api/songs/{id}` are left untouched. Missing params → `400`.
- Injection scan (SQLi, XSS, path traversal, `.env`, `wp-admin`, etc.) runs against **both the raw and percent-decoded URL** — `%20`, `%3C`, `%2F` payloads cannot slip through. Malformed URL encoding → `400`.
- Request bodies larger than 10 KB → `413`. Suspicious bodies → `400`.

Security events are logged with the client IP.

## 🔧 API Endpoints

All endpoints require `GET` and are mounted under `/api`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/search?query=` | Global search |
| `GET` | `/api/search/songs?query=` | Search songs |
| `GET` | `/api/search/albums?query=` | Search albums |
| `GET` | `/api/search/artists?query=` | Search artists |
| `GET` | `/api/search/playlists?query=` | Search playlists |
| `GET` | `/api/songs?ids=` OR `?link=` | Songs by ID or link |
| `GET` | `/api/songs/{id}` | Song details by ID |
| `GET` | `/api/songs/{id}/suggestions` | Song suggestions by ID |
| `GET` | `/api/albums?id=` OR `?link=` | Album by ID or link |
| `GET` | `/api/artists?id=` OR `?link=` | Artist by ID or link |
| `GET` | `/api/artists/{id}` | Artist details by ID |
| `GET` | `/api/artists/{id}/songs` | Paginated artist songs |
| `GET` | `/api/artists/{id}/albums` | Paginated artist albums |
| `GET` | `/api/playlists?id=` OR `?link=` | Playlist by ID or link |

Interactive, auto-generated documentation is available at `/docs` (Scalar UI) with the raw OpenAPI 3.1 spec at `/swagger`.

## 📚 Documentation

Full upstream API documentation: [https://saavn.dev/docs](https://saavn.dev/docs)

## 🔌 Running Locally

1. Clone the repository:

   ```sh
   git clone https://github.com/SKS-WEBDEV/zylaes-saavn
   cd zylaes-saavn
   ```

### Using Docker

```sh
docker-compose up
```

OR

### Manually

> [!NOTE]
> You need `Bun(1.0.29+)` or `Node.js(v20+)`

2. Install the required dependencies:

   ```sh
   bun install
   ```

3. Launch the development server:

   ```sh
   bun run dev
   ```

## ☁️ Deploying Your Own Instance

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SKS-WEBDEV/zylaes-saavn)

Set environment variables in the Vercel dashboard to enable API-key mode:

```
JIOSAAVN_API_KEYS=key1,key2,key3
```

Generate secure keys, e.g.:

```sh
bun -e "console.log(crypto.randomBytes(24).toString('hex'))"
```

> [!IMPORTANT]
> Store API keys **only** in the environment variable. Never commit them to the repository.

### Cloudflare Workers

[![Deploy with Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/SKS-WEBDEV/zylaes-saavn)

## 📜 License

This project is distributed under the [MIT License](https://opensource.org/licenses/MIT). For more information, see the [LICENSE](LICENSE) file included in this repository.

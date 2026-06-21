// Upbit API JWT generator using Web Crypto API (no Node.js dependency).
// Spec: https://docs.upbit.com/docs/upbit-quotation-websocket
//
// Upbit uses HS256-signed JWTs with the following payload:
//   { access_key, nonce }
// For REST calls with a query string, an additional query_hash field is required.

const ACCESS_KEY = import.meta.env.VITE_UPBIT_ACCESS_KEY as string
const SECRET_KEY = import.meta.env.VITE_UPBIT_SECRET_KEY as string

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function encodeJson(obj: object): string {
  return b64url(new TextEncoder().encode(JSON.stringify(obj)).buffer as ArrayBuffer)
}

async function hmacSha256(secret: string, data: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
}

/** Generate a Upbit JWT for WebSocket or REST (no query string). */
export async function generateUpbitToken(): Promise<string> {
  const header  = encodeJson({ alg: 'HS256', typ: 'JWT' })
  const payload = encodeJson({ access_key: ACCESS_KEY, nonce: crypto.randomUUID() })
  const sig     = b64url(await hmacSha256(SECRET_KEY, `${header}.${payload}`))
  return `${header}.${payload}.${sig}`
}

/**
 * Generate a Upbit JWT for REST calls that include a query string.
 * query_hash is SHA-512 of the raw query string, hex-encoded.
 */
export async function generateUpbitTokenWithQuery(queryString: string): Promise<string> {
  const hashBuf  = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(queryString))
  const hashHex  = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
  const header   = encodeJson({ alg: 'HS256', typ: 'JWT' })
  const payload  = encodeJson({
    access_key:       ACCESS_KEY,
    nonce:            crypto.randomUUID(),
    query_hash:       hashHex,
    query_hash_alg:   'SHA512',
  })
  const sig = b64url(await hmacSha256(SECRET_KEY, `${header}.${payload}`))
  return `${header}.${payload}.${sig}`
}

export function hasUpbitKeys(): boolean {
  return Boolean(ACCESS_KEY && SECRET_KEY)
}

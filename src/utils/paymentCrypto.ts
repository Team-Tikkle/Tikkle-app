/**
 * paymentCrypto.ts
 *
 * Cryptographic utilities and API client for the payment scraping endpoint.
 * Uses only the native Web Crypto API (window.crypto.subtle) — no third-party deps.
 *
 * POST /api/payments
 *   Auth   : HMAC-SHA256 (X-Tikkle-Timestamp + X-Tikkle-Signature headers)
 *   NO JWT : Bypasses Axios so the Authorization header interceptor is not applied.
 */

import type { PaymentRequest, PaymentResponse } from '@/types'

const SECRET_KEY = import.meta.env.VITE_PAYMENT_SECRET_KEY as string
const API_BASE   = import.meta.env.VITE_API_BASE_URL as string

// ── Shared helpers ──────────────────────────────────────────────────────────

/** Encode a UTF-8 string into a Uint8Array for crypto operations. */
const encode = (s: string) => new TextEncoder().encode(s)

/** Convert an ArrayBuffer to a lowercase hex string. */
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Convert an ArrayBuffer to a Base64-encoded string. */
function toBase64(buffer: ArrayBuffer): string {
  let binary = ''
  new Uint8Array(buffer).forEach((b) => (binary += String.fromCharCode(b)))
  return window.btoa(binary)
}

// Cached CryptoKey — imported once, reused across all signature calls.
let _hmacKey: CryptoKey | null = null

async function _getHmacKey(): Promise<CryptoKey> {
  if (_hmacKey) return _hmacKey
  _hmacKey = await window.crypto.subtle.importKey(
    'raw',
    encode(SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,      // not extractable
    ['sign'],
  )
  return _hmacKey
}

// ── A. Idempotent Transaction ID Generator ──────────────────────────────────

/**
 * generateTransactionId
 *
 * Creates a deterministic SHA-256 hex hash that serves as the idempotency key
 * for a payment event. The same inputs always produce the same ID, so retrying
 * a failed request reuses the same transactionId and prevents double-counting.
 *
 * Input format (no delimiters): merchant + amount + cardCompany + pushReceivedTimeMillis
 *
 * @param merchant               - Merchant name from the push notification
 * @param amount                 - Payment amount in KRW
 * @param cardCompany            - Card issuer name (e.g. "신한카드")
 * @param pushReceivedTimeMillis - Unix timestamp in milliseconds when the push arrived
 * @returns Lowercase hexadecimal SHA-256 digest string
 */
export async function generateTransactionId(
  merchant: string,
  amount: number,
  cardCompany: string,
  pushReceivedTimeMillis: number,
): Promise<string> {
  // Concatenate without any delimiter — exact spec-mandated order
  const raw = merchant + String(amount) + cardCompany + String(pushReceivedTimeMillis)
  const digest = await window.crypto.subtle.digest('SHA-256', encode(raw))
  return toHex(digest)
}

// ── B. HMAC Signature Generator ─────────────────────────────────────────────

/**
 * generateTikkleSignature
 *
 * Produces the X-Tikkle-Signature header value using HMAC-SHA256.
 *
 * Message formula: JSON.stringify(payload) + String(timestamp)
 *   - payload is compact JSON (no spaces/newlines) — altering whitespace
 *     would break server-side HMAC verification.
 *   - timestamp is the same Unix-second value sent in X-Tikkle-Timestamp.
 *
 * @param payload   - The PaymentRequest object to sign
 * @param timestamp - Unix timestamp in seconds (Math.floor(Date.now() / 1000))
 * @returns Base64-encoded HMAC-SHA256 signature string
 */
export async function generateTikkleSignature(
  payload: PaymentRequest,
  timestamp: number,
): Promise<string> {
  // Step 1: Compact JSON — no spaces or newlines
  const json = JSON.stringify(payload)

  // Step 2: Append the exact timestamp string immediately after the JSON
  const message = json + String(timestamp)

  // Step 3: HMAC-SHA256 sign
  const key = await _getHmacKey()
  const sig = await window.crypto.subtle.sign('HMAC', key, encode(message))

  return toBase64(sig)
}

// ── C. Dedicated API fetch client ────────────────────────────────────────────

/** Codes returned in the response body on non-success paths. */
const PAYMENT_ERROR_MESSAGES: Record<string, string> = {
  'COMMON-001':  '잘못된 요청입니다. 결제 정보를 확인해 주세요.',
  'PAYMENT-001': '유효하지 않은 보안 서명입니다.',
}

/**
 * submitScrapedPayment
 *
 * Dispatches a signed payment event to POST /api/payments using the native
 * fetch API, deliberately bypassing the Axios instance so the JWT Authorization
 * header interceptor is never applied to this request.
 *
 * Header contract:
 *   X-Tikkle-Timestamp : Unix seconds (string)
 *   X-Tikkle-Signature : Base64 HMAC-SHA256 of (compact JSON + timestamp)
 *
 * Status handling:
 *   200 + code SUCCESS    → resolves normally
 *   400 + code COMMON-001 → throws with localized UI message
 *   401 + code PAYMENT-001→ throws with localized UI message
 *   other                 → throws with HTTP status code
 *
 * @param payload - Complete PaymentRequest (transactionId must already be set)
 * @throws Error with a Korean user-facing message on all failure paths
 */
export async function submitScrapedPayment(payload: PaymentRequest): Promise<void> {
  // Capture the current Unix timestamp in seconds
  const timestamp = Math.floor(Date.now() / 1000)

  // Build X-Tikkle-Signature from the exact payload + timestamp
  const signature = await generateTikkleSignature(payload, timestamp)

  // Compact JSON body — must not be reformatted after signing
  const body = JSON.stringify(payload)

  const response = await fetch(`${API_BASE}/api/payments`, {
    method: 'POST',
    headers: {
      'Content-Type':       'application/json',
      'X-Tikkle-Timestamp': String(timestamp),
      'X-Tikkle-Signature': signature,
    },
    body,
  })

  // Parse JSON response on any status so we can read the business code
  let result: PaymentResponse | null = null
  try {
    result = await response.json() as PaymentResponse
  } catch {
    // Non-JSON body (e.g. 500 HTML error page) — fall through to status check
  }

  if (response.ok && result?.code === 'SUCCESS') {
    return // 200 OK — payment event accepted
  }

  // Map business error code to Korean UI message, fall back to HTTP status
  const code = result?.code ?? ''
  const message = PAYMENT_ERROR_MESSAGES[code]
    ?? `결제 이벤트 전송 실패 (HTTP ${response.status})`

  // Log for debugging in dev
  if (import.meta.env.DEV) {
    console.error('[submitScrapedPayment]', response.status, code, result?.message)
  }

  throw new Error(message)
}

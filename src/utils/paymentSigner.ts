/**
 * paymentSigner.ts
 *
 * Generates the X-Tikkle-Signature header value using the native Web Crypto API.
 * No third-party dependencies — runs entirely in the browser via window.crypto.subtle.
 *
 * Signing algorithm: HMAC-SHA256
 * Message format : JSON.stringify(payload) + String(timestamp)
 * Output format  : Base64-encoded signature string
 */

const SECRET_KEY = import.meta.env.VITE_PAYMENT_SECRET_KEY as string

/**
 * Import the raw secret key bytes into a CryptoKey object for HMAC-SHA256.
 * Cached after first call to avoid re-importing on every request.
 */
let _cachedKey: CryptoKey | null = null

async function _getHmacKey(): Promise<CryptoKey> {
  if (_cachedKey) return _cachedKey

  const keyBytes = new TextEncoder().encode(SECRET_KEY)
  _cachedKey = await window.crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,         // not extractable
    ['sign'],      // only used for signing
  )
  return _cachedKey
}

/**
 * Converts a binary ArrayBuffer into a Base64-encoded string.
 */
function _arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

/**
 * Generate the HMAC-SHA256 signature for a payment payload.
 *
 * @param payload   - The exact request body object (will be compact-JSON-serialized)
 * @param timestamp - Unix timestamp in seconds (Math.floor(Date.now() / 1000))
 * @returns Base64-encoded HMAC-SHA256 signature string
 *
 * Message = JSON.stringify(payload) + String(timestamp)
 * e.g.   = '{"userId":1,"merchant":"테스트 가맹점","amount":10000,"balance":50000,"transactionId":"abc"}1717000000'
 */
export async function generatePaymentSignature(
  payload: object,
  timestamp: number,
): Promise<string> {
  // Step 1: Compact JSON serialization — no spaces or newlines
  const payloadString = JSON.stringify(payload)

  // Step 2: Concatenate payload string + timestamp string
  const message = payloadString + String(timestamp)

  // Step 3: Sign with HMAC-SHA256
  const key = await _getHmacKey()
  const messageBytes = new TextEncoder().encode(message)
  const signatureBuffer = await window.crypto.subtle.sign('HMAC', key, messageBytes)

  // Step 4: Encode binary result as Base64
  return _arrayBufferToBase64(signatureBuffer)
}

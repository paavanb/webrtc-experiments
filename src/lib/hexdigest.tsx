import * as nacl from 'tweetnacl'

/**
 * Compute the SHA-256 hash of some data, returning a hex string.
 */
export default async function hexdigest(data: Uint8Array): Promise<string> {
  const hash =
    process.env.NODE_ENV === 'production'
      ? await crypto.subtle.digest('SHA-256', data) // NOTE: Chrome 60+ disables crypto.subtle over non-TLS connections
      : await new Promise<Uint8Array>(resolve => resolve(nacl.hash(data)))
  const byteArray = Array.from(new Uint8Array(hash))

  const hex = byteArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hex
}

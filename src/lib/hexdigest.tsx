/**
 * Compute the SHA-256 hash of some data, returning a hex string.
 */
export default async function hexdigest(data: ArrayBuffer): Promise<string> {
  // NOTE: Chrome 60+ disables crypto.subtle over non-TLS connections
  const hash = await crypto.subtle.digest('SHA-256', data)
  const byteArray = Array.from(new Uint8Array(hash))

  const hex = byteArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hex
}

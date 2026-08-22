import crypto from 'crypto'

/// AES-256-GCM encryption for sensitive values (TG session string).
/// Key: 32-byte hex from APP_ENCRYPTION_KEY (or derived from it).

function getKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY
  if (!raw) throw new Error('APP_ENCRYPTION_KEY is not set')
  // Accept 32-byte hex (64 chars) or base64; otherwise SHA-256 the raw string to derive a 32-byte key.
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex')
  try {
    const b = Buffer.from(raw, 'base64')
    if (b.length === 32) return b
  } catch {
    /* fallthrough */
  }
  return crypto.createHash('sha256').update(raw).digest()
}

export function encrypt(plain: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':')
}

export function decrypt(payload: string): string {
  const key = getKey()
  const [ivB, tagB, encB] = payload.split(':')
  if (!ivB || !tagB || !encB) throw new Error('Invalid encrypted payload')
  const iv = Buffer.from(ivB, 'base64')
  const tag = Buffer.from(tagB, 'base64')
  const enc = Buffer.from(encB, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(enc), decipher.final()])
  return dec.toString('utf8')
}

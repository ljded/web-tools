import CryptoJS from 'crypto-js'
import { SignJWT, jwtVerify } from 'jose'
import { sm2, sm4 } from 'sm-crypto'
import bcrypt from 'bcryptjs'

type CryptoCommand =
  | { type: 'ping' }
  | { type: 'aes'; text: string; key: string; mode: 'encrypt' | 'decrypt' }
  | { type: 'sm2'; text: string; mode: 'encrypt' | 'decrypt' | 'sign' | 'verify'; pubKey?: string; priKey?: string; pub?: string; pri?: string }
  | { type: 'rsa'; text: string; mode: 'encrypt' | 'decrypt'; pubKey?: string; priKey?: string }
  | { type: 'jwt-sign'; text: string; secret: string }
  | { type: 'jwt-verify'; token: string; secret: string }
  | { type: 'bcrypt-hash'; text: string; rounds?: number }
  | { type: 'bcrypt-compare'; text: string; hash: string }
  | { type: 'bcrypt-verify'; text: string; hash: string }
  | { type: 'sm4'; text: string; key: string; mode: 'encrypt' | 'decrypt' }
  | { type: 'sm2-gen-keys' }

const ctx = self as unknown as {
  postMessage(message: unknown): void
  onmessage: ((event: MessageEvent<{ id: string; payload: CryptoCommand }>) => void) | null
}

function ok(id: string, result: unknown) {
  ctx.postMessage({ id, ok: true, result })
}

function fail(id: string, error: unknown) {
  ctx.postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) })
}

ctx.onmessage = async (event) => {
  const { id, payload } = event.data
  try {
    switch (payload.type) {
      case 'ping': {
        ok(id, { pong: true })
        return
      }
      case 'aes': {
        if (payload.mode === 'encrypt') {
          ok(id, CryptoJS.AES.encrypt(payload.text, payload.key).toString())
        } else {
          const bytes = CryptoJS.AES.decrypt(payload.text, payload.key)
          ok(id, bytes.toString(CryptoJS.enc.Utf8) || '__crypto_error:decrypt_failed')
        }
        return
      }
      case 'sm2': {
        const pubKey = payload.pubKey ?? payload.pub
        const priKey = payload.priKey ?? payload.pri
        if (payload.mode === 'encrypt') {
          if (!pubKey) throw new Error('__crypto_error:missing_public_key')
          ok(id, sm2.doEncrypt(payload.text, pubKey, 1))
        } else if (payload.mode === 'decrypt') {
          if (!priKey) throw new Error('__crypto_error:missing_private_key')
          ok(id, sm2.doDecrypt(payload.text, priKey, 1) || '__crypto_error:decrypt_failed')
        } else if (payload.mode === 'sign') {
          if (!priKey) throw new Error('__crypto_error:missing_private_key')
          ok(id, sm2.doSignature(payload.text, priKey))
        } else if (payload.mode === 'verify') {
          if (!pubKey) throw new Error('__crypto_error:missing_public_key')
          const sig = payload.text.split('||')[1] || ''
          const msg = payload.text.split('||')[0] || ''
          if (!sig || !msg) throw new Error('__crypto_error:signature_format')
          const valid = sm2.doVerifySignature(msg, sig, pubKey)
          ok(id, valid ? '__crypto_result:signature_verified' : '__crypto_result:signature_failed')
        }
        return
      }
      case 'rsa': {
        throw new Error('__crypto_error:rsa_worker_required')
      }
      case 'jwt-sign': {
        const secret = new TextEncoder().encode(payload.secret)
        let body: Record<string, unknown>
        try {
          const parsed = JSON.parse(payload.text)
          body = typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : { value: parsed }
        } catch {
          body = { value: payload.text }
        }
        const token = await new SignJWT(body)
          .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
          .setIssuedAt()
          .sign(secret)
        ok(id, token)
        return
      }
      case 'jwt-verify': {
        const secret = new TextEncoder().encode(payload.secret)
        const { payload: decodedPayload, protectedHeader } = await jwtVerify(payload.token, secret)
        ok(id, { header: protectedHeader, payload: decodedPayload })
        return
      }
      case 'bcrypt-hash': {
        ok(id, bcrypt.hashSync(payload.text, payload.rounds ?? 10))
        return
      }
      case 'bcrypt-compare': {
        ok(id, bcrypt.compareSync(payload.text, payload.hash))
        return
      }
      case 'bcrypt-verify': {
        ok(id, bcrypt.compareSync(payload.text, payload.hash))
        return
      }
      case 'sm4': {
        const keyBytes = new TextEncoder().encode(payload.key)
        if (keyBytes.length !== 16) throw new Error('__crypto_error:sm4_key_invalid')
        const keyHex = Array.from(keyBytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
        if (payload.mode === 'encrypt') {
          ok(id, sm4.encrypt(payload.text, keyHex, { mode: 'ecb', padding: 'pkcs#7' }))
        } else {
          ok(id, sm4.decrypt(payload.text.trim(), keyHex, { mode: 'ecb', padding: 'pkcs#7' }) || '__crypto_error:decrypt_failed')
        }
        return
      }
      case 'sm2-gen-keys': {
        const keys = sm2.generateKeyPairHex()
        ok(id, { pub: keys.publicKey, pri: keys.privateKey })
        return
      }
      default:
        throw new Error('__crypto_error:unsupported_command')
    }
  } catch (error) {
    fail(id, error)
  }
}

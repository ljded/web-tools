import CryptoJS from 'crypto-js'
import { sm2, sm4 } from 'sm-crypto'
import bcrypt from 'bcryptjs'

type CryptoCommand =
  | { type: 'aes'; text: string; key: string; mode: 'encrypt' | 'decrypt' }
  | { type: 'sm2'; text: string; mode: 'encrypt' | 'decrypt' | 'sign' | 'verify'; pubKey?: string; priKey?: string }
  | { type: 'rsa'; text: string; mode: 'encrypt' | 'decrypt'; pubKey?: string; priKey?: string }
  | { type: 'bcrypt-hash'; text: string; rounds?: number }
  | { type: 'bcrypt-compare'; text: string; hash: string }
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

ctx.onmessage = (event) => {
  const { id, payload } = event.data
  try {
    switch (payload.type) {
      case 'aes': {
        if (payload.mode === 'encrypt') {
          ok(id, CryptoJS.AES.encrypt(payload.text, payload.key).toString())
        } else {
          const bytes = CryptoJS.AES.decrypt(payload.text, payload.key)
          ok(id, bytes.toString(CryptoJS.enc.Utf8) || '解密失败，请检查密钥和密文')
        }
        return
      }
      case 'sm2': {
        if (payload.mode === 'encrypt') {
          if (!payload.pubKey) throw new Error('缺少公钥')
          ok(id, sm2.doEncrypt(payload.text, payload.pubKey, 1))
        } else if (payload.mode === 'decrypt') {
          if (!payload.priKey) throw new Error('缺少私钥')
          ok(id, sm2.doDecrypt(payload.text, payload.priKey, 1) || '解密失败')
        } else if (payload.mode === 'sign') {
          if (!payload.priKey) throw new Error('缺少私钥')
          ok(id, sm2.doSignature(payload.text, payload.priKey))
        } else if (payload.mode === 'verify') {
          if (!payload.pubKey) throw new Error('缺少公钥')
          const sig = payload.text.split('||')[1] || ''
          const msg = payload.text.split('||')[0] || ''
          if (!sig || !msg) throw new Error('格式：消息||签名')
          const valid = sm2.doVerifySignature(msg, sig, payload.pubKey)
          ok(id, valid ? '✅ 签名验证通过' : '❌ 签名验证失败')
        }
        return
      }
      case 'rsa': {
        // RSA encrypt/decrypt is fast enough for small text; keep in main thread or use JSEncrypt here if needed
        // For consistency we support it, but in practice the main-thread JSEncrypt is acceptable for <4k chars.
        // If we want to offload, we'd need to import jsencrypt in worker (may be heavy).
        throw new Error('RSA 加解密建议在主线程执行，或单独使用 rsa.worker')
      }
      case 'bcrypt-hash': {
        ok(id, bcrypt.hashSync(payload.text, payload.rounds ?? 10))
        return
      }
      case 'bcrypt-compare': {
        ok(id, bcrypt.compareSync(payload.text, payload.hash) ? '密码匹配' : '密码不匹配')
        return
      }
      case 'sm4': {
        const keyBytes = new TextEncoder().encode(payload.key)
        if (keyBytes.length !== 16) throw new Error('SM4 密钥必须是 16 字节文本')
        const keyHex = Array.from(keyBytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
        if (payload.mode === 'encrypt') {
          ok(id, sm4.encrypt(payload.text, keyHex, { mode: 'ecb', padding: 'pkcs#7' }))
        } else {
          ok(id, sm4.decrypt(payload.text.trim(), keyHex, { mode: 'ecb', padding: 'pkcs#7' }) || '解密失败，请检查密文或密钥')
        }
        return
      }
      case 'sm2-gen-keys': {
        const keys = sm2.generateKeyPairHex()
        ok(id, { pub: keys.publicKey, pri: keys.privateKey })
        return
      }
      default:
        throw new Error('不支持的加密命令')
    }
  } catch (error) {
    fail(id, error)
  }
}

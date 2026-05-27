import JSEncrypt from 'jsencrypt'

type RsaCommand =
  | { type: 'generate'; size?: number }
  | { type: 'crypt'; text: string; mode: 'encrypt' | 'decrypt'; pub?: string; pri?: string }

const ctx = self as unknown as {
  postMessage(message: unknown): void
  onmessage: ((event: MessageEvent<{ id: string; payload: RsaCommand }>) => void) | null
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
    if (payload.type === 'generate') {
      const encrypt = new JSEncrypt({ default_key_size: String(payload.size || 2048) })
      ok(id, {
        pub: encrypt.getPublicKey(),
        pri: encrypt.getPrivateKey(),
      })
      return
    }

    if (payload.type === 'crypt') {
      const cryptor = new JSEncrypt()
      if (payload.mode === 'encrypt') {
        if (!payload.pub) throw new Error('__crypto_error:missing_public_key')
        cryptor.setPublicKey(payload.pub)
        const encrypted = cryptor.encrypt(payload.text)
        if (!encrypted) throw new Error('__crypto_error:rsa_encrypt_failed')
        ok(id, encrypted)
        return
      }

      if (!payload.pri) throw new Error('__crypto_error:missing_private_key')
      cryptor.setPrivateKey(payload.pri)
      const decrypted = cryptor.decrypt(payload.text)
      if (!decrypted) throw new Error('__crypto_error:rsa_decrypt_failed')
      ok(id, decrypted)
      return
    }

    throw new Error('__crypto_error:unsupported_command')
  } catch (error) {
    fail(id, error)
  }
}

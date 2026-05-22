import JSEncrypt from 'jsencrypt'

type RsaCommand = { type: 'generate'; size?: number }

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
    if (payload.type !== 'generate') throw new Error('不支持的 RSA 命令')
    const encrypt = new JSEncrypt({ default_key_size: String(payload.size || 2048) })
    ok(id, {
      publicKey: encrypt.getPublicKey(),
      privateKey: encrypt.getPrivateKey(),
    })
  } catch (error) {
    fail(id, error)
  }
}

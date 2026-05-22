import CryptoJS from 'crypto-js'
import { sm3 } from 'sm-crypto'

type HashCommand =
  | { type: 'text'; text: string }
  | { type: 'file-start' }
  | { type: 'file-chunk'; chunk: ArrayBuffer }
  | { type: 'file-finish' }

interface HashSession {
  md5: any
  sha1: any
  sha256: any
  sha512: any
}

const ctx = self as unknown as {
  postMessage(message: unknown): void
  onmessage: ((event: MessageEvent<{ id: string; payload: HashCommand & { sessionId?: string } }>) => void) | null
}
const sessions = new Map<string, HashSession>()

function ok(id: string, result: unknown) {
  ctx.postMessage({ id, ok: true, result })
}

function fail(id: string, error: unknown) {
  ctx.postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) })
}

function createSession(): HashSession {
  return {
    md5: CryptoJS.algo.MD5.create(),
    sha1: CryptoJS.algo.SHA1.create(),
    sha256: CryptoJS.algo.SHA256.create(),
    sha512: CryptoJS.algo.SHA512.create(),
  }
}

ctx.onmessage = (event) => {
  const { id, payload } = event.data

  try {
    if (payload.type === 'text') {
      ok(id, {
        MD5: CryptoJS.MD5(payload.text).toString(),
        SHA1: CryptoJS.SHA1(payload.text).toString(),
        SHA256: CryptoJS.SHA256(payload.text).toString(),
        SHA512: CryptoJS.SHA512(payload.text).toString(),
        SM3: sm3(payload.text),
      })
      return
    }

    if (payload.type === 'file-start') {
      const sessionId = crypto.randomUUID()
      sessions.set(sessionId, createSession())
      ok(id, { sessionId })
      return
    }

    if (payload.type === 'file-chunk') {
      const session = sessions.get(payload.sessionId || '')
      if (!session) throw new Error('未找到文件哈希会话')
      const bytes = new Uint8Array(payload.chunk)
      const wordArray = CryptoJS.lib.WordArray.create(bytes)
      session.md5.update(wordArray)
      session.sha1.update(wordArray)
      session.sha256.update(wordArray)
      session.sha512.update(wordArray)
      ok(id, { updated: true })
      return
    }

    if (payload.type === 'file-finish') {
      const session = sessions.get(payload.sessionId || '')
      if (!session) throw new Error('未找到文件哈希会话')
      sessions.delete(payload.sessionId || '')
      ok(id, {
        MD5: session.md5.finalize().toString(),
        SHA1: session.sha1.finalize().toString(),
        SHA256: session.sha256.finalize().toString(),
        SHA512: session.sha512.finalize().toString(),
        SM3: 'SM3 不支持文件哈希',
      })
      return
    }

    throw new Error('不支持的哈希命令')
  } catch (error) {
    fail(id, error)
  }
}

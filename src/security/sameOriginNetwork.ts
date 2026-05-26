const allowedProtocols = new Set(['http:', 'https:', 'data:', 'blob:'])
const externalFetchAllowances = new Map<string, number>()

function normalizeUrl(input: string | URL): string {
  return new URL(input, window.location.href).href
}

function isSameOriginUrl(input: string | URL): boolean {
  const url = input instanceof URL ? input : new URL(input, window.location.href)
  if (!allowedProtocols.has(url.protocol)) return false
  if (url.protocol === 'data:' || url.protocol === 'blob:') return true
  return url.origin === window.location.origin
}

function consumeExternalFetchAllowance(input: string | URL): boolean {
  const url = normalizeUrl(input)
  const count = externalFetchAllowances.get(url) ?? 0
  if (count <= 0) return false
  if (count === 1) externalFetchAllowances.delete(url)
  else externalFetchAllowances.set(url, count - 1)
  return true
}

export function allowExternalFetchOnce(input: string | URL) {
  if (typeof window === 'undefined') return
  const url = normalizeUrl(input)
  externalFetchAllowances.set(url, (externalFetchAllowances.get(url) ?? 0) + 1)
}

function assertSameOrigin(input: string | URL, api: string) {
  if (isSameOriginUrl(input)) return

  throw new Error(`${api} blocked cross-origin request: ${String(input)}`)
}

function getRequestUrl(input: RequestInfo | URL): string | URL {
  return input instanceof Request ? input.url : input
}

export function installSameOriginNetworkGuard() {
  if (typeof window === 'undefined') return

  const nativeFetch = window.fetch.bind(window)
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = getRequestUrl(input)
      if (!isSameOriginUrl(url) && !consumeExternalFetchAllowance(url)) {
        assertSameOrigin(url, 'fetch')
      }
    } catch (err) {
      return Promise.reject(err)
    }
    return nativeFetch(input, init)
  }) as typeof window.fetch

  const nativeOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function open(method: string, url: string | URL, ...rest: unknown[]) {
    assertSameOrigin(url, 'XMLHttpRequest')
    return nativeOpen.apply(this, [method, url, ...rest] as Parameters<typeof nativeOpen>)
  }

  if (navigator.sendBeacon) {
    const nativeSendBeacon = navigator.sendBeacon.bind(navigator)
    navigator.sendBeacon = ((url: string | URL, data?: BodyInit | null) => {
      assertSameOrigin(url, 'sendBeacon')
      return nativeSendBeacon(url, data)
    }) as typeof navigator.sendBeacon
  }

  const NativeWebSocket = window.WebSocket
  window.WebSocket = new Proxy(NativeWebSocket, {
    construct(target, args: ConstructorParameters<typeof WebSocket>) {
      const url = new URL(String(args[0]), window.location.href)
      const isSecure = window.location.protocol === 'https:'
      const expectedProtocol = isSecure ? 'wss:' : 'ws:'
      if (url.origin !== window.location.origin.replace(/^http/, 'ws') || url.protocol !== expectedProtocol) {
        throw new Error(`WebSocket blocked cross-origin request: ${String(args[0])}`)
      }
      return Reflect.construct(target, args)
    },
  })

  const NativeEventSource = window.EventSource
  if (NativeEventSource) {
    window.EventSource = new Proxy(NativeEventSource, {
      construct(target, args: ConstructorParameters<typeof EventSource>) {
        assertSameOrigin(String(args[0]), 'EventSource')
        return Reflect.construct(target, args)
      },
    })
  }
}

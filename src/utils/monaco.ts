import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

;(self as any).MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'json') {
      return new jsonWorker()
    }
    return new editorWorker()
  },
}

const localeMap: Record<string, string> = {
  Find: '查找', Replace: '替换', 'Find Next': '查找下一个',
  'Find Previous': '查找上一个', 'Replace All': '全部替换',
  'Match Case': '区分大小写', 'Match Whole Word': '全词匹配',
  'Use Regular Expression': '正则', Close: '关闭',
  'No results': '无结果', 'Toggle Replace': '切换替换',
  'Go to Definition': '转到定义', 'Format Document': '格式化文档',
  Cut: '剪切', Copy: '复制', Paste: '粘贴', 'Select All': '全选',
  Undo: '撤销', Redo: '重做',
}

let localeObserverInstalled = false

function translateMonacoLocale() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let n: Text | null
  while ((n = walker.nextNode() as Text | null)) {
    if (n.parentElement?.closest('.monaco-editor')) {
      const t = n.textContent?.trim()
      if (t && localeMap[t]) nodes.push(n)
    }
  }
  for (const node of nodes) {
    const t = node.textContent?.trim()
    if (t && localeMap[t]) node.textContent = localeMap[t]
  }
  for (const btn of document.querySelectorAll('.monaco-editor .find-widget button[title]')) {
    const t = (btn as HTMLElement).getAttribute('title')
    if (t === 'Close' || t === '关闭') (btn as HTMLElement).removeAttribute('title')
  }
}

export function applyChineseLocale() {
  if (localeObserverInstalled) {
    translateMonacoLocale()
    return
  }

  localeObserverInstalled = true
  const obs = new MutationObserver((mutations) => {
    const hasMonacoMutation = mutations.some((mutation) => {
      const target = mutation.target
      const element = target instanceof Element ? target : target.parentElement
      return Boolean(element?.closest('.monaco-editor'))
    })
    if (!hasMonacoMutation) return
    translateMonacoLocale()
  })

  translateMonacoLocale()
  obs.observe(document.body, { childList: true, subtree: true, characterData: true })
}

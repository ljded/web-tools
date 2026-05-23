import type { RouteRecordRaw } from 'vue-router'

export type ToolDomain = 'dev' | 'crypto' | 'media' | 'text'

export interface ToolDefinition {
  name: string
  path: string
  i18nKey: string
  domain: ToolDomain
  icon: string
  color: string
  component: () => Promise<unknown>
  keywords?: string[]
  tags?: string[]
  hotkey?: string
}

export const domainI18nKeys: Record<ToolDomain, string> = {
  dev: 'nav.groups.common',
  text: 'nav.groups.text',
  crypto: 'nav.groups.security',
  media: 'nav.groups.media',
}

export const tools: ToolDefinition[] = [
  {
    name: 'hash',
    path: '/hash',
    i18nKey: 'tools.hash',
    domain: 'crypto',
    icon: 'i-lucide-hash',
    color: 'error',
    component: () => import('@/views/crypto/Hash.vue'),
    keywords: ['md5', 'sha1', 'sha256', 'sha512', 'sm3', 'checksum', 'digest', 'hash', '哈希', '校验'],
    tags: ['security', 'file'],
  },
  {
    name: 'crypto',
    path: '/crypto',
    i18nKey: 'tools.crypto',
    domain: 'crypto',
    icon: 'i-lucide-lock',
    color: 'error',
    component: () => import('@/views/crypto/Crypto.vue'),
    keywords: ['aes', 'rsa', 'sm2', 'sm4', 'bcrypt', 'encrypt', 'decrypt', '加密', '解密'],
    tags: ['security', 'format'],
  },
  {
    name: 'json',
    path: '/json',
    i18nKey: 'tools.json',
    domain: 'dev',
    icon: 'i-lucide-braces',
    color: 'primary',
    component: () => import('@/views/dev/JsonEditor.vue'),
    keywords: ['json', 'format', 'validate', 'jwt', 'formatter', '格式化', '验证'],
    tags: ['format', 'dev'],
  },
  {
    name: 'timestamp',
    path: '/timestamp',
    i18nKey: 'tools.timestamp',
    domain: 'dev',
    icon: 'i-lucide-clock',
    color: 'warning',
    component: () => import('@/views/dev/Timestamp.vue'),
    keywords: ['timestamp', 'timezone', 'date', 'unix', '时间戳', '时区', '日期'],
    tags: ['convert', 'dev'],
  },
  {
    name: 'random',
    path: '/random',
    i18nKey: 'tools.random',
    domain: 'dev',
    icon: 'i-lucide-shuffle',
    color: 'secondary',
    component: () => import('@/views/dev/RandomData.vue'),
    keywords: ['random', 'uuid', 'faker', 'phone', '生成', '随机', '假数据'],
    tags: ['generate', 'dev'],
  },
  {
    name: 'color',
    path: '/color',
    i18nKey: 'tools.color',
    domain: 'dev',
    icon: 'i-lucide-palette',
    color: 'primary',
    component: () => import('@/views/dev/ColorTool.vue'),
    keywords: ['color', 'hex', 'rgb', 'hsl', 'picker', '颜色', '调色板'],
    tags: ['convert', 'dev'],
  },
  {
    name: 'base64',
    path: '/base64',
    i18nKey: 'tools.base64',
    domain: 'text',
    icon: 'i-lucide-code',
    color: 'success',
    component: () => import('@/views/text/Base64.vue'),
    keywords: ['base64', 'encode', 'decode', 'data uri', '编码', '解码', 'base64 编码'],
    tags: ['convert', 'format'],
  },
  {
    name: 'encoding',
    path: '/encoding',
    i18nKey: 'tools.encoding',
    domain: 'text',
    icon: 'i-lucide-type',
    color: 'info',
    component: () => import('@/views/text/Encoding.vue'),
    keywords: ['unicode', 'gbk', 'utf8', 'url encode', 'html entity', '编码转换', '字符集'],
    tags: ['convert'],
  },
  {
    name: 'regex',
    path: '/regex',
    i18nKey: 'tools.regex',
    domain: 'text',
    icon: 'i-lucide-regex',
    color: 'warning',
    component: () => import('@/views/text/Regex.vue'),
    keywords: ['regex', 'regexp', 'match', 'replace', '正则', '正则表达式'],
    tags: ['dev'],
  },
  {
    name: 'diff',
    path: '/diff',
    i18nKey: 'tools.diff',
    domain: 'text',
    icon: 'i-lucide-file-diff',
    color: 'neutral',
    component: () => import('@/views/text/DiffTool.vue'),
    keywords: ['diff', 'compare', 'merge', '对比', '比较', '文本差异'],
    tags: ['compare', 'dev'],
  },
  {
    name: 'qrcode',
    path: '/qrcode',
    i18nKey: 'tools.qrcode',
    domain: 'media',
    icon: 'i-lucide-qr-code',
    color: 'primary',
    component: () => import('@/views/media/Qrcode.vue'),
    keywords: ['qrcode', 'qr', '二维码', 'barcode', '扫码'],
    tags: ['generate', 'media'],
  },
  {
    name: 'image',
    path: '/image',
    i18nKey: 'tools.image',
    domain: 'media',
    icon: 'i-lucide-image',
    color: 'success',
    component: () => import('@/views/media/ImageTool.vue'),
    keywords: ['image', 'compress', 'resize', 'crop', '图片', '压缩', '裁剪'],
    tags: ['convert', 'media'],
  },
  {
    name: 'pdf',
    path: '/pdf',
    i18nKey: 'tools.pdf',
    domain: 'media',
    icon: 'i-lucide-file-text',
    color: 'error',
    component: () => import('@/views/media/PdfTool.vue'),
    keywords: ['pdf', 'merge', 'split', 'extract', 'merge pdf', 'pdf 合并', 'pdf 拆分'],
    tags: ['convert', 'media', 'file'],
  },
]

export function createToolRoutes(): RouteRecordRaw[] {
  return tools.map((tool) => ({
    path: tool.path,
    name: tool.name,
    component: tool.component,
    meta: {
      domain: tool.domain,
      i18nKey: tool.i18nKey,
      keywords: tool.keywords,
      tags: tool.tags,
    },
  }))
}

import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import {
  Braces,
  Clock,
  Code,
  FileDiff,
  FileText,
  Hash,
  Image,
  Lock,
  Palette,
  QrCode,
  Regex,
  Shuffle,
  Type,
} from '@lucide/vue'

export type ToolDomain = 'dev' | 'crypto' | 'media' | 'text'

export interface ToolDefinition {
  name: string
  path: string
  i18nKey: string
  domain: ToolDomain
  icon: Component
  color: string
  component: () => Promise<unknown>
  /** 搜索关键词（支持中英文混合） */
  keywords?: string[]
  /** 功能标签 */
  tags?: string[]
  /** 全局快捷键（如 'Ctrl+K'） */
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
    icon: Hash,
    color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200',
    component: () => import('@/views/crypto/Hash.vue'),
    keywords: ['md5', 'sha1', 'sha256', 'sha512', 'sm3', 'checksum', 'digest', 'hash', '哈希', '校验'],
    tags: ['security', 'file'],
  },
  {
    name: 'crypto',
    path: '/crypto',
    i18nKey: 'tools.crypto',
    domain: 'crypto',
    icon: Lock,
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200',
    component: () => import('@/views/crypto/Crypto.vue'),
    keywords: ['aes', 'rsa', 'sm2', 'sm4', 'bcrypt', 'encrypt', 'decrypt', '加密', '解密'],
    tags: ['security', 'format'],
  },
  {
    name: 'json',
    path: '/json',
    i18nKey: 'tools.json',
    domain: 'dev',
    icon: Braces,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
    component: () => import('@/views/dev/JsonEditor.vue'),
    keywords: ['json', 'format', 'validate', 'jwt', 'formatter', '格式化', '验证'],
    tags: ['format', 'dev'],
  },
  {
    name: 'timestamp',
    path: '/timestamp',
    i18nKey: 'tools.timestamp',
    domain: 'dev',
    icon: Clock,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
    component: () => import('@/views/dev/Timestamp.vue'),
    keywords: ['timestamp', 'timezone', 'date', 'unix', '时间戳', '时区', '日期'],
    tags: ['convert', 'dev'],
  },
  {
    name: 'random',
    path: '/random',
    i18nKey: 'tools.random',
    domain: 'dev',
    icon: Shuffle,
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200',
    component: () => import('@/views/dev/RandomData.vue'),
    keywords: ['random', 'uuid', 'faker', 'phone', '生成', '随机', '假数据'],
    tags: ['generate', 'dev'],
  },
  {
    name: 'color',
    path: '/color',
    i18nKey: 'tools.color',
    domain: 'dev',
    icon: Palette,
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-200',
    component: () => import('@/views/dev/ColorTool.vue'),
    keywords: ['color', 'hex', 'rgb', 'hsl', 'picker', '颜色', '调色板'],
    tags: ['convert', 'dev'],
  },
  {
    name: 'base64',
    path: '/base64',
    i18nKey: 'tools.base64',
    domain: 'text',
    icon: Code,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
    component: () => import('@/views/text/Base64.vue'),
    keywords: ['base64', 'encode', 'decode', 'data uri', '编码', '解码', 'base64 编码'],
    tags: ['convert', 'format'],
  },
  {
    name: 'encoding',
    path: '/encoding',
    i18nKey: 'tools.encoding',
    domain: 'text',
    icon: Type,
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200',
    component: () => import('@/views/text/Encoding.vue'),
    keywords: ['unicode', 'gbk', 'utf8', 'url encode', 'html entity', '编码转换', '字符集'],
    tags: ['convert'],
  },
  {
    name: 'regex',
    path: '/regex',
    i18nKey: 'tools.regex',
    domain: 'text',
    icon: Regex,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-200',
    component: () => import('@/views/text/Regex.vue'),
    keywords: ['regex', 'regexp', 'match', 'replace', '正则', '正则表达式'],
    tags: ['dev'],
  },
  {
    name: 'diff',
    path: '/diff',
    i18nKey: 'tools.diff',
    domain: 'text',
    icon: FileDiff,
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100',
    component: () => import('@/views/text/DiffTool.vue'),
    keywords: ['diff', 'compare', 'merge', '对比', '比较', '文本差异'],
    tags: ['compare', 'dev'],
  },
  {
    name: 'qrcode',
    path: '/qrcode',
    i18nKey: 'tools.qrcode',
    domain: 'media',
    icon: QrCode,
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200',
    component: () => import('@/views/media/Qrcode.vue'),
    keywords: ['qrcode', 'qr', '二维码', 'barcode', '扫码'],
    tags: ['generate', 'media'],
  },
  {
    name: 'image',
    path: '/image',
    i18nKey: 'tools.image',
    domain: 'media',
    icon: Image,
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-200',
    component: () => import('@/views/media/ImageTool.vue'),
    keywords: ['image', 'compress', 'resize', 'crop', '图片', '压缩', '裁剪'],
    tags: ['convert', 'media'],
  },
  {
    name: 'pdf',
    path: '/pdf',
    i18nKey: 'tools.pdf',
    domain: 'media',
    icon: FileText,
    color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200',
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

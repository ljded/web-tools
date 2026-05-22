# Web Tools

一个基于 Vue 3 + TypeScript + Vite 构建的本地优先在线工具箱，采用 Apple HIG 设计语言，支持 PWA 离线使用。

## 项目理念

**本地优先、可离线回访的网页工具集。**

> **Local First**：所有计算均在浏览器本地完成，不依赖外部 CDN 或远程接口。首次加载后通过 PWA（Progressive Web App）+ Service Worker 缓存机制，后续可在完全断网环境下继续使用——只需在浏览器地址栏输入 URL 即可正常加载并运行所有工具。

---

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Vue 3.5 (Composition API) + Vue Router 5 |
| 构建 | Vite 8 |
| 语言 | TypeScript 6 |
| 样式 | Tailwind CSS v4 |
| UI 组件 | @nuxt/ui v4 (自动导入) |
| 状态管理 | Pinia 3 |
| 国际化 | Vue I18n 11 |
| PWA | vite-plugin-pwa + Workbox |
| 历史存储 | IndexedDB (原生封装) |
| 单元测试 | Vitest 3 + happy-dom |
| E2E 测试 | Playwright |
| 开发调试 | vite-plugin-vue-devtools |

### 核心依赖

| 包 | 用途 |
|---|---|
| monaco-editor | JSON 编辑器、正则测试等代码编辑场景 |
| crypto-js / sm-crypto / jsencrypt / jose | 哈希、对称/非对称加密、国密算法、JWT |
| bcryptjs | 密码哈希 |
| qrcode / jsqr | 二维码生成与解析 |
| pdf-lib / pdfjs-dist | PDF 合并、拆分、提取 |
| browser-image-compression | 图片压缩 |
| dayjs | 时间戳与日期处理 |
| @faker-js/faker | 随机假数据生成 |
| gbk.js | GBK 编码转换 |

---

## 架构目标

1. **工具注册表驱动** — 所有工具在 `src/tools/registry.ts` 中集中声明，路由和首页导航自动生成，支持 `keywords` 搜索和 `tags` 分类，新增工具只需注册一条配置。
2. **Apple HIG 风格** — 使用 Nuxt UI 组件（自动导入）+ Tailwind CSS v4 自定义主题令牌，实现圆角、留白、系统字体、柔和阴影的苹果风格界面。
3. **计算卸载** — 所有计算密集型任务（哈希、加密、密钥生成、PDF 处理）均通过 Worker 计算池执行，主线程保持响应。
4. **IndexedDB 历史** — 工具历史记录使用 IndexedDB 持久化，突破 localStorage 容量限制，支持大文件引用。
5. **全局错误边界** — 通过 `ErrorBoundary` 组件捕获工具页面未处理异常，防止应用白屏，统一消息反馈。
6. **视图按域分组** — `src/views/` 按 `dev/crypto/media/text` 四大领域分组，配合 Rollup `manualChunks` 实现按需代码分割。
7. **共享逻辑抽象** — 通过 Composables 和共享组件统一处理常见模式（状态管理、历史记录、文件操作、剪贴板）。

---

## 工具列表

共 **13** 个工具，按领域分组：

### 安全加密 (crypto)
| 工具 | 路由 | 功能 |
|---|---|---|
| Hash | `/hash` | MD5 / SHA1 / SHA256 / SHA512 / SM3 哈希计算 |
| Crypto | `/crypto` | AES / RSA / SM2 / SM4 加解密 + bcrypt |

### 开发工具 (dev)
| 工具 | 路由 | 功能 |
|---|---|---|
| JSON 编辑器 | `/json` | JSON 格式化、验证、JWT 解码 |
| 时间戳 | `/timestamp` | Unix 时间戳与日期互转、时区转换 |
| 随机数据 | `/random` | UUID / 假数据生成（基于 Faker） |
| 颜色工具 | `/color` | HEX / RGB / HSL 颜色转换与拾取 |

### 文本处理 (text)
| 工具 | 路由 | 功能 |
|---|---|---|
| Base64 | `/base64` | Base64 编解码、Data URI 生成 |
| 字符编码 | `/encoding` | Unicode / GBK / UTF-8 / URL / HTML Entity 编码转换 |
| 正则测试 | `/regex` | 正则表达式在线测试与匹配 |
| 文本对比 | `/diff` | 文本差异对比（并排 / 统一视图） |

### 媒体处理 (media)
| 工具 | 路由 | 功能 |
|---|---|---|
| 二维码 | `/qrcode` | 二维码生成与解析 |
| 图片处理 | `/image` | 图片压缩、格式转换 |
| PDF 工具 | `/pdf` | PDF 合并、拆分、页面提取 |

---

## 目录结构

```
src/
  composables/         # 共享逻辑组合式函数
    useToolState.ts    # 工具状态管理：input + history + error + loading
    useDebouncedCompute.ts  # 防抖计算
    useFileHandler.ts  # 文件处理抽象
    useClipboard.ts    # 剪贴板操作封装
    index.ts           # Composables 统一导出
  tools/
    registry.ts        # 工具注册表：声明所有工具配置，自动生成路由与首页导航
  views/
    Home.vue           # 首页：工具卡片网格 + 搜索
    crypto/            # 加密安全类工具
      Hash.vue
      Crypto.vue
    dev/               # 开发类工具
      JsonEditor.vue
      Timestamp.vue
      RandomData.vue
      ColorTool.vue
    media/             # 媒体处理类工具
      ImageTool.vue
      Qrcode.vue
      PdfTool.vue
    text/              # 文本处理类工具
      Base64.vue
      Encoding.vue
      Regex.vue
      DiffTool.vue
  components/
    Layout.vue         # 全局布局：侧边栏导航、主题/语言切换
    ToolLayout.vue     # 工具页面统一骨架：UContainer 宽度控制
    ToolHeader.vue     # 工具标题区：icon + title + description
    ToolCard.vue       # 内容卡片容器
    ModeSwitch.vue     # 模式切换按钮组
    CopyBtn.vue        # 复制按钮组件
    ActionBar.vue      # 操作按钮栏
    InputPanel.vue     # 输入面板
    ErrorBoundary.vue  # 全局错误边界：onErrorCaptured + 重试
    Snackbar.vue       # 全局消息条
    FileDropZone.vue   # 文件拖拽上传组件
    ResultPanel.vue    # 结果展示卡片：含复制按钮插槽
    CopyButton.vue     # 复制按钮：支持 compact 模式
    HistoryPanel.vue   # 历史记录下拉面板
    MonacoEditor.vue   # Monaco 编辑器封装
    JsonTree.vue       # JSON 树形预览
  stores/
    preference.ts      # 全局偏好 Store：语言 + 主题（统一持久化）
    snackbar.ts        # 消息条 Store
    clipboardBus.ts    # 剪贴板事件总线
  workers/
    pool.ts            # Worker 计算池：acquire/release 模式
    hash.worker.ts     # 哈希计算 Worker（MD5/SHA1/SHA256/SHA512/SM3）
    crypto.worker.ts   # 加密计算 Worker（AES/SM2/SM4/bcrypt）
    rsa.worker.ts      # RSA 密钥生成 Worker
    transfer.ts        # Worker 传输协议定义
  utils/
    db.ts              # IndexedDB 封装
    history.ts         # 基于 IndexedDB 的历史记录管理
    persist.ts         # usePersistedRef：localStorage 持久化响应式数据
    clipboard.ts       # 剪贴板复制工具
    monaco.ts          # Monaco Editor 通用配置
    imageCompression.ts # 图片压缩工具函数
  router/
    index.ts           # 路由入口：自动注入 createToolRoutes()
  i18n/                # 国际化配置 (zh-CN / en-US)
  style.css            # Tailwind CSS v4 + Apple HIG 设计令牌
```

---

## 测试

```bash
# 运行单元测试
npm test

# Watch 模式
npm run test:watch

# E2E 测试
npm run test:e2e
```

- **单元测试**：Vitest 3 + happy-dom 模拟浏览器环境
- **组件测试**：@vue/test-utils
- **E2E 测试**：Playwright
- 测试文件与源文件同目录，命名为 `*.test.ts`

---

## 开发规范

### 新增工具

1. 在 `src/tools/registry.ts` 的 `tools` 数组中添加配置：

```ts
{
  name: 'myTool',           // 路由 name
  path: '/my-tool',         // 路由 path
  i18nKey: 'tools.myTool',  // 国际化键
  domain: 'dev',            // 分组：dev | crypto | media | text
  icon: MyIcon,             // Lucide 图标组件
  color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
  component: () => import('@/views/dev/MyTool.vue'),
  keywords: ['my', 'tool'],  // 搜索关键词（支持中英文）
  tags: ['convert'],        // 功能标签
  hotkey: 'Ctrl+K',         // 可选：全局快捷键
}
```

2. 在 `src/views/{domain}/MyTool.vue` 创建页面，推荐组合：
   - `<ToolLayout max-width="3xl|4xl">` — 页面宽度约束
   - `<ToolHeader>` — 标题区
   - `<ToolCard>` — 内容卡片
   - `<CopyBtn>` — 复制按钮
   - `useToolState()` — 统一状态管理
   - `useHistory()` — 历史记录
   - `usePersistedRef()` — 表单状态持久化

3. 若涉及计算密集型逻辑，新建 `src/workers/{name}.worker.ts` 并通过 `createWorkerPool()` 调用。

### UI 风格（Apple HIG）

- **圆角**：卡片 `rounded-2xl` / `rounded-3xl`，按钮 `rounded-full`
- **颜色**：使用 `@theme` 定义的设计令牌，如 `bg-surface text-on-surface`
- **字体**：`-apple-system` 字体栈，全局已配置
- **组件**：优先使用 Nuxt UI 组件（`UButton`、`UCard`、`UBadge`、`UProgress`、`UContainer`），由 `@nuxt/ui` Vite 插件自动导入，无需手动 import
- **阴影**：柔和阴影 `shadow-sm`，避免重阴影

### Composables 使用

#### useToolState（推荐）

统一封装工具页面的常见状态：

```ts
import { useToolState } from '@/composables'

const { input, history, saveHistory, error, isProcessing, reset } = useToolState<string, { text: string }>({
  storageKey: 'myTool',
  defaultInput: '',
  historyOptions: {
    maxCount: 15,
    generateLabel: (d) => d.text.slice(0, 30),
  },
})
```

#### useFileHandler

```ts
import { useFileHandler } from '@/composables'

const fileHandler = useFileHandler({ maxSize: 1024 * 1024 * 1024 })
// fileHandler.file, fileHandler.setFile, fileHandler.removeFile, fileHandler.formatSize
```

#### useClipboard

```ts
import { useClipboard } from '@/composables'

const { copied, copy } = useClipboard()
await copy(text, '复制成功提示')
```

### Worker 计算池

```ts
import MyWorker from '@/workers/my.worker?worker'
import { createWorkerPool } from '@/workers/pool'

const pool = createWorkerPool(() => new MyWorker(), { size: 2 })

const lease = await pool.acquire()
try {
  const result = await lease.send<string>({ type: 'compute', data })
} finally {
  lease.release()
}
```

Worker 内部使用 `id` 跟踪请求/响应：

```ts
const { id, payload } = event.data
try {
  // ... 计算
  ctx.postMessage({ id, ok: true, result })
} catch (error) {
  ctx.postMessage({ id, ok: false, error: error.message })
}
```

### 历史记录

```ts
import { useHistory } from '@/utils/history'

const history = useHistory<{ text: string }>('web-tools:mytool:history', {
  maxCount: 15,
  generateLabel: (d) => d.text.slice(0, 30),
})

// 添加历史（自动去重 + 防抖）
history.add({ text: input.value })

// 模板中使用
<HistoryPanel
  :items="history.items.value"
  @select="onSelect"
  @remove="history.remove"
  @clear="history.clear"
/>
```

### 全局偏好

统一通过 `usePreferenceStore()` 管理语言和主题：

```ts
import { usePreferenceStore } from '@/stores/preference'

const pref = usePreferenceStore()
pref.setLocale('zh-CN')
pref.setThemeMode('dark')
```

持久化键为 `web-tools:preferences`，不再兼容旧版 `web-tools:locale` / `theme-mode`。

---

## PWA 配置

使用 `vite-plugin-pwa` 自动生成 Service Worker（Workbox）：

- `registerType: 'autoUpdate'` — 自动检测更新
- `cleanupOutdatedCaches: true` — 清理旧缓存
- `navigateFallback: 'index.html'` — SPA 路由支持
- 图片/字体使用 `CacheFirst` 策略，缓存 30 天
- `maximumFileSizeToCacheInBytes: 8MB` — 支持大文件缓存

---

## 构建

```bash
# 安装依赖
npm install

# 开发
npm run dev

# 构建
npm run build

# 仅类型检查
npm run type-check

# 代码格式化
npm run format
```

**Node.js 版本要求**：`^20.19.0 || >=22.12.0`

构建产物位于 `dist/` 目录，同时生成 `dist/stats.html`（Rollup Visualizer 构建分析报告）。

---

## 代码分割策略

`vite.config.ts` 中配置 Rollup `manualChunks`，按工具领域和重量级依赖自动拆分：

| Chunk | 内容 |
|---|---|
| `tools-crypto` | `src/views/crypto/*`（哈希、加密） |
| `tools-media` | `src/views/media/*`（二维码、图片、PDF） |
| `tools-text` | `src/views/text/*`（Base64、编码、正则、对比） |
| `tools-dev` | `src/views/dev/*`（JSON、时间戳、随机数据、颜色） |
| `vendor-monaco` | monaco-editor + MonacoEditor 组件 |

首次加载仅引入框架核心和当前工具所在 chunk，其他工具页面按路由懒加载，避免首屏体积过大。

---

## 开发调试

- 开发模式下启用 `vite-plugin-vue-devtools`，可在浏览器中直接使用 Vue DevTools 面板
- 构建后查看 `dist/stats.html` 分析各 chunk 体积与依赖关系（gzip / brotli 压缩后大小）

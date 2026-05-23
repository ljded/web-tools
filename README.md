# Web Tools

一个基于 Vue 3 + TypeScript + Vite 的本地优先网页工具箱。项目使用 Nuxt UI v4、Tailwind CSS v4 和 PWA 离线缓存，工具计算尽量在浏览器本地完成，不依赖远程接口。

## 特性

- 本地优先：文本、加密、图片、PDF 等处理逻辑在浏览器端完成。
- 离线可用：通过 `vite-plugin-pwa` 和 Workbox 生成 Service Worker，首次加载后可离线回访。
- 统一界面：工具页使用 `ToolLayout`、`ToolHeader`、`ToolCard`、`ResultPanel`、`FileDropZone` 等共享组件。
- Nuxt UI v4：使用 `@nuxt/ui/vite` + Vue plugin，组件自动导入，颜色使用语义 token。
- 深色模式：由 Nuxt UI color mode 支持，布局与 Monaco 编辑器同步主题。
- 国际化：业务文案使用 `vue-i18n`，Nuxt UI 内置组件文案通过 `UApp :locale` 配置。
- 历史记录：工具历史使用 IndexedDB 持久化，避免 localStorage 容量限制。
- Worker 计算池：哈希、加密、密钥生成等重任务通过 Worker 执行，降低主线程阻塞。

## 工具清单

| 分类 | 工具 | 路径 | 说明 |
|---|---|---|---|
| 加密安全 | 哈希工具 | `/hash` | MD5、SHA1、SHA256、SHA512、SM3，支持大文件分块计算 |
| 加密安全 | 加解密工具 | `/crypto` | AES、SM4、RSA、SM2、JWT、Bcrypt |
| 开发工具 | JSON 编辑器 | `/json` | 格式化、压缩、转义、JWT 解析、树形预览 |
| 开发工具 | 时间戳工具 | `/timestamp` | 实时时间戳、日期转换、时区计算、日期差值 |
| 开发工具 | 随机数据生成 | `/random` | 手机号、身份证号、UUID、密码、姓名、地址等假数据 |
| 开发工具 | 颜色工具 | `/color` | Hex、RGB、HSL 格式转换，支持取色器能力 |
| 文本工具 | Base64 工具 | `/base64` | 文本与文件 Base64 编码、解码、图片预览 |
| 文本工具 | 编码转换 | `/encoding` | URL、HTML Entity、Unicode、GBK、Base64 等转换 |
| 文本工具 | 正则工具 | `/regex` | 正则匹配、替换、分割和高亮结果 |
| 文本工具 | 对比工具 | `/diff` | 文本 Diff 与图片并排/叠加对比 |
| 媒体工具 | 二维码工具 | `/qrcode` | 二维码生成、上传解析、Base64/Data URL 解析 |
| 媒体工具 | 图片工具 | `/image` | 压缩、格式转换、缩放、水印、旋转、裁剪 |
| 媒体工具 | PDF 工具 | `/pdf` | 压缩、合并、拆分、水印、转图片 |

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Vue 3.5 + Vue Router 5 |
| 语言 | TypeScript 6 |
| 构建 | Vite 8 |
| UI | Nuxt UI v4 |
| 样式 | Tailwind CSS v4 |
| 状态管理 | Pinia 3 |
| 国际化 | Vue I18n 11 + Nuxt UI locale |
| PWA | vite-plugin-pwa + Workbox |
| 测试 | Vitest 3 + happy-dom，Playwright |
| 编辑器 | Monaco Editor |
| 存储 | IndexedDB + localStorage |

## 关键依赖

| 包 | 用途 |
|---|---|
| `@nuxt/ui` | UI 组件、主题、Toast、颜色模式 |
| `monaco-editor` | JSON 编辑器、Diff 编辑器等代码编辑场景 |
| `crypto-js`、`sm-crypto`、`jsencrypt`、`jose` | 加密、国密、RSA、JWT |
| `bcryptjs` | Bcrypt 哈希和验证 |
| `qrcode`、`jsqr` | 二维码生成与解析 |
| `pdf-lib`、`pdfjs-dist` | PDF 合并、拆分、渲染和转换 |
| `browser-image-compression` | 图片压缩 |
| `dayjs` | 时间戳和日期计算 |
| `@faker-js/faker` | 随机测试数据 |
| `gbk.js` | GBK 编码转换 |

## 项目结构

```text
src/
  App.vue                 # UApp、Nuxt UI locale、PWA 更新提示
  main.ts                 # Vue、Pinia、Router、I18n、Nuxt UI plugin 初始化
  style.css               # Tailwind CSS v4 和 Nuxt UI 样式入口
  components/
    Layout.vue            # 应用外壳、导航、语言和主题切换
    ToolLayout.vue        # 工具页容器宽度与垂直节奏
    ToolHeader.vue        # 工具页标题、说明、图标、actions slot
    ToolCard.vue          # 统一 UCard 包装，支持 compact/flush/padding
    ResultPanel.vue       # 统一结果展示、复制按钮、语义色、紧凑模式
    FileDropZone.vue      # 基于 UFileUpload 的统一上传入口
    HistoryPanel.vue      # 工具历史记录面板
    CopyBtn.vue           # 复制按钮和 Toast 反馈
    MonacoEditor.vue      # Monaco 单编辑器/Diff 编辑器封装
    JsonTree.vue          # JSON 树形预览
  composables/            # 共享组合式逻辑
  i18n/                   # 业务国际化配置
  router/                 # 路由入口
  stores/                 # Pinia store
  tools/
    registry.ts           # 工具注册表，驱动路由和首页导航
  utils/                  # IndexedDB、历史、持久化、剪贴板等工具
  views/
    crypto/               # 加密安全类工具
    dev/                  # 开发类工具
    media/                # 媒体类工具
    text/                 # 文本类工具
  workers/                # Worker 和 Worker pool
```

## UI 规范

项目是 Vue + Vite 应用，不是 Nuxt 应用，但使用 Nuxt UI 的 Vite 集成。

`vite.config.ts` 中启用 Nuxt UI：

```ts
NuxtUI({
  ui: {
    colors: {
      primary: 'blue',
      secondary: 'violet',
      neutral: 'slate',
    },
  },
  colorMode: true,
})
```

全局要求：

- `src/App.vue` 使用 `<UApp :locale="uiLocale">` 包裹应用。
- `index.html` 中 `#app` 保持 `class="isolate"`。
- 业务文案通过 `vue-i18n` 管理，Nuxt UI 组件内置文案通过 `@nuxt/ui/locale` 对象配置。
- 样式优先使用 Nuxt UI 语义 token，例如 `text-default`、`text-muted`、`bg-elevated`、`border-default`、`text-success`。
- 图标使用 Iconify 格式，例如 `i-lucide-copy`、`i-lucide-file-up`。
- 工具页优先使用共享骨架：`ToolLayout` -> `ToolHeader` -> `ToolCard` -> `ResultPanel`。
- 文件上传入口优先使用 `FileDropZone`，但 Monaco、canvas、PDF、worker、原生文件 input、取色器 fallback 等浏览器能力可以保留原生实现。

## 工具页结构

推荐结构：

```vue
<ToolLayout max-width="4xl">
  <ToolHeader title="工具标题" description="工具说明" icon="i-lucide-wrench" />

  <ToolCard>
    <!-- 当前工具的模式选项、输入区、输出区 -->
  </ToolCard>
</ToolLayout>
```

如果工具内有切换项，优先放在输入输出区顶部，而不是拆成多个分散卡片。结果内容优先通过 `ResultPanel` 展示，复制行为由 `CopyBtn` 或 `ResultPanel` 内置复制按钮处理。

## 开发

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

构建生产包：

```bash
npm run build
```

预览生产包：

```bash
npm run preview
```

## 验证

常用检查命令：

```bash
npm run type-check
npm run test
npm run build
```

其他命令：

```bash
npm run check-i18n
npm run format
npm run test:watch
npm run test:e2e
```

`npm run build` 会先执行 `vue-tsc --build`，再运行 Vite 生产构建。

## Node.js 要求

```text
^20.19.0 || ^22.12.0 || ^24.5.0
```

## 代码分割

`vite.config.ts` 按工具域拆分主要 chunk：

| Chunk | 内容 |
|---|---|
| `tools-crypto` | 哈希、加解密 |
| `tools-media` | 二维码、图片、PDF |
| `tools-text` | Base64、编码、正则、对比 |
| `tools-dev` | JSON、时间戳、随机数据、颜色 |
| `vendor-monaco` | Monaco Editor |

构建时 Monaco、PDF worker 和媒体处理相关 chunk 可能超过 Vite 默认大小阈值，这是当前功能体积带来的预期警告。

## 新增工具流程

1. 在 `src/views/<domain>/` 下创建工具页面。
2. 使用 `ToolLayout`、`ToolHeader`、`ToolCard`、`ResultPanel` 等共享组件保持视觉统一。
3. 在 `src/tools/registry.ts` 中注册工具定义，包括 `name`、`path`、`i18nKey`、`domain`、`icon`、`color`、`component`、`keywords`、`tags`。
4. 在 `src/i18n/` 中补充业务文案。
5. 运行 `npm run type-check`、`npm run test`、`npm run build` 验证。

# web-tools

Web Tools 是一个基于 Vue 3、Vite、TypeScript 和 Tailwind CSS 的本地优先网页工具集。目标是打开后无需联网依赖、启动快速、界面清晰美观，并让常用开发与内容处理任务都在浏览器本地完成。

## 设计目标

- 无外部 CDN、字体或接口依赖，适合断网、内网和临时排障场景。
- 工具输入和计算留在浏览器本地，不主动上传数据。
- 生产构建支持 Service Worker 缓存，首次访问后可离线回访。
- 使用 Hash 路由，降低静态托管和子目录部署的服务器配置要求。

## 功能

- JSON 编辑、格式化、校验、结构预览和 JWT 解析。
- Base64 编解码、文件转 Base64、图片预览和下载。
- 哈希计算，支持文本和大文件流式 MD5 / SHA1 / SHA256 / SHA512。
- AES、SM2、SM4、RSA、JWT、Bcrypt 等加密与校验工具。
- 时间戳、时区换算、日期差值、正则测试、文本 Diff 和图片 Diff。
- 二维码离线生成与图片解析、颜色格式转换和屏幕取色。
- 图片压缩、格式转换、尺寸调整、水印、旋转、裁剪等批处理能力。
- PDF 压缩、合并、拆分、水印和转图片。
- 随机字符串、UUID、手机号、邮箱、地址、银行卡等模拟数据生成。

## 国际化

- 内置中文和英文文案，右上角语言按钮可在 `zh-CN` 与 `en-US` 间切换。
- 语言选择会保存在浏览器本地存储中，下次打开自动恢复。
- 页面 `lang` 会随语言切换更新，便于浏览器和辅助技术识别当前语言。

## 离线能力

生产环境会注册 `public/sw.js`，缓存应用壳、Manifest、图标和同源静态资源。首次在线加载完成后，再次打开已访问过的工具页面可从浏览器缓存启动。

开发环境不注册 Service Worker，避免缓存影响调试。

## PWA 支持

- `public/manifest.webmanifest` 提供应用名称、启动地址、主题色、独立窗口显示模式和图标声明。
- `index.html` 使用相对路径引用 Manifest 与站点图标，适合静态托管和子目录部署。
- 生产构建在页面加载后注册 Service Worker；注册失败不会影响工具本身运行。

## 本地数据

- 工具输入和计算默认只在浏览器内处理，不主动上传到任何服务端。
- 主题、语言、部分工具输入和历史记录会写入当前浏览器的 `localStorage`。
- 清理浏览器站点数据会同时清除这些本地偏好和历史记录。

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Format Source Files

```sh
npm run format
```

### Preview Production Build

```sh
npm run preview
```

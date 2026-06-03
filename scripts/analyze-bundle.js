#!/usr/bin/env node

/**
 * Bundle 大小分析脚本
 *
 * 分析构建后的文件大小，识别大型依赖
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * @typedef {Object} FileSize
 * @property {string} name
 * @property {number} size
 * @property {number} sizeKB
 * @property {number} sizeMB
 * @property {number} [gzipSize]
 */

/**
 * 获取文件大小
 * @param {string} filePath
 * @returns {number}
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath)
    return stats.size
  } catch {
    return 0
  }
}

/**
 * 递归获取目录中的所有文件
 * @param {string} dir
 * @param {string[]} fileList
 * @returns {string[]}
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList)
    } else {
      fileList.push(filePath)
    }
  }

  return fileList
}

/**
 * 格式化文件大小
 * @param {number} bytes
 * @returns {string}
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

/**
 * 分析 dist 目录
 */
function analyzeBuild() {
  const distDir = path.resolve(__dirname, '../dist')

  if (!fs.existsSync(distDir)) {
    console.error('❌ dist 目录不存在，请先运行 npm run build')
    process.exit(1)
  }

  console.log('📦 Bundle 大小分析')
  console.log('='.repeat(80))
  console.log()

  // 获取所有文件
  const allFiles = getAllFiles(distDir)

  // 按类型分组
  /** @type {Record<string, FileSize[]>} */
  const filesByType = {
    js: [],
    css: [],
    html: [],
    assets: [],
    other: [],
  }

  let totalSize = 0

  for (const file of allFiles) {
    const size = getFileSize(file)
    totalSize += size

    const relativePath = path.relative(distDir, file)
    const ext = path.extname(file).slice(1)

    /** @type {FileSize} */
    const fileSize = {
      name: relativePath,
      size,
      sizeKB: size / 1024,
      sizeMB: size / (1024 * 1024),
    }

    if (ext === 'js') {
      filesByType.js.push(fileSize)
    } else if (ext === 'css') {
      filesByType.css.push(fileSize)
    } else if (ext === 'html') {
      filesByType.html.push(fileSize)
    } else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp'].includes(ext)) {
      filesByType.assets.push(fileSize)
    } else {
      filesByType.other.push(fileSize)
    }
  }

  // 打印总览
  console.log('📊 总览:')
  console.log(`  总文件数: ${allFiles.length}`)
  console.log(`  总大小: ${formatSize(totalSize)}`)
  console.log()

  // 打印 JavaScript 文件
  if (filesByType.js.length > 0) {
    console.log('📜 JavaScript 文件:')
    const sortedJs = filesByType.js.sort((a, b) => b.size - a.size)
    const totalJs = sortedJs.reduce((sum, f) => sum + f.size, 0)

    for (const file of sortedJs.slice(0, 10)) {
      const bar = '█'.repeat(Math.ceil(file.sizeKB / 10))
      console.log(`  ${formatSize(file.size).padEnd(12)} ${bar} ${file.name}`)
    }

    if (sortedJs.length > 10) {
      console.log(`  ... 还有 ${sortedJs.length - 10} 个文件`)
    }

    console.log(`  JS 总大小: ${formatSize(totalJs)}`)
    console.log()
  }

  // 打印 CSS 文件
  if (filesByType.css.length > 0) {
    console.log('🎨 CSS 文件:')
    const sortedCss = filesByType.css.sort((a, b) => b.size - a.size)
    const totalCss = sortedCss.reduce((sum, f) => sum + f.size, 0)

    for (const file of sortedCss) {
      console.log(`  ${formatSize(file.size).padEnd(12)} ${file.name}`)
    }

    console.log(`  CSS 总大小: ${formatSize(totalCss)}`)
    console.log()
  }

  // 打印资源文件
  if (filesByType.assets.length > 0) {
    console.log('🖼️  资源文件:')
    const sortedAssets = filesByType.assets.sort((a, b) => b.size - a.size)
    const totalAssets = sortedAssets.reduce((sum, f) => sum + f.size, 0)

    for (const file of sortedAssets.slice(0, 10)) {
      console.log(`  ${formatSize(file.size).padEnd(12)} ${file.name}`)
    }

    if (sortedAssets.length > 10) {
      console.log(`  ... 还有 ${sortedAssets.length - 10} 个文件`)
    }

    console.log(`  资源总大小: ${formatSize(totalAssets)}`)
    console.log()
  }

  // 性能建议
  console.log('💡 性能建议:')
  console.log()

  // 检查大文件
  const largeFiles = [...filesByType.js, ...filesByType.css].filter((f) => f.sizeKB > 500)

  if (largeFiles.length > 0) {
    console.log('⚠️  发现大文件 (>500KB):')
    for (const file of largeFiles) {
      console.log(`  - ${file.name} (${formatSize(file.size)})`)
    }
    console.log('  建议: 考虑代码分割或动态导入')
    console.log()
  }

  // 检查 vendor chunks
  const vendorFiles = filesByType.js.filter((f) => f.name.includes('vendor'))
  if (vendorFiles.length > 0) {
    const totalVendor = vendorFiles.reduce((sum, f) => sum + f.size, 0)
    console.log(`📦 Vendor 包大小: ${formatSize(totalVendor)}`)
    if (totalVendor > 1024 * 1024) {
      console.log('  建议: Vendor 包较大，考虑按需导入依赖')
    }
    console.log()
  }

  // Bundle 大小目标
  console.log('🎯 Bundle 大小目标:')
  const jsSize = filesByType.js.reduce((sum, f) => sum + f.size, 0)
  const cssSize = filesByType.css.reduce((sum, f) => sum + f.size, 0)

  const jsSizeKB = jsSize / 1024
  const cssSizeKB = cssSize / 1024

  console.log(`  JavaScript: ${formatSize(jsSize)}`)
  if (jsSizeKB < 200) {
    console.log('    ✅ 优秀 (<200KB)')
  } else if (jsSizeKB < 500) {
    console.log('    ⚠️  可接受 (200-500KB)')
  } else {
    console.log('    ❌ 需要优化 (>500KB)')
  }

  console.log(`  CSS: ${formatSize(cssSize)}`)
  if (cssSizeKB < 50) {
    console.log('    ✅ 优秀 (<50KB)')
  } else if (cssSizeKB < 100) {
    console.log('    ⚠️  可接受 (50-100KB)')
  } else {
    console.log('    ❌ 需要优化 (>100KB)')
  }

  console.log()
  console.log('='.repeat(80))
  console.log('✅ 分析完成')
}

// 运行分析
analyzeBuild()

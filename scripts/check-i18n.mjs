/**
 * i18n 覆盖率检查脚本
 *
 * 用法：node scripts/check-i18n.mjs
 * 或添加到 package.json scripts: "check-i18n": "node scripts/check-i18n.mjs"
 *
 * 检查项：
 * 1. i18n locale 文件中声明的 key 是否在所有 Vue 模板和 script 中被使用
 * 2. Vue 文件中使用的 i18n key 是否在两个 locale 文件中都有声明
 * 3. 检测 Vue 模板中可能遗漏中文硬编码文本（无 t() 包裹的中文字符串）
 * 4. 检测 zh-CN 和 en-US 的 key 是否对称
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SRC = resolve(ROOT, 'src')
const LOCALE_DIR = resolve(SRC, 'i18n', 'locales')
const showAllUnused = process.argv.includes('--all-unused')

// 收集需要参与 key 提取的源码文件，排除 locale 自身，避免把声明误判为使用
function collectSourceFiles(dir) {
  const result = []
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      const relativeDir = full.replace(/\\/g, '/')
      if (
        !['node_modules', '.git', 'dist', 'workers'].includes(entry.name) &&
        !relativeDir.endsWith('/src/i18n/locales')
      ) {
        result.push(...collectSourceFiles(full))
      }
    } else if (entry.name.endsWith('.vue') || entry.name.endsWith('.ts')) {
      result.push(full)
    }
  }
  return result
}

// 解析 i18n key（扁平化）
function flattenKeys(obj, prefix = '') {
  const result = {}
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(result, flattenKeys(v, fullKey))
    } else {
      result[fullKey] = v
    }
  }
  return result
}

// 从源码中提取 t('xxx')、$t('xxx')、i18nKey 和 labelKey 引用
function extractI18nUsage(content) {
  const keys = new Set()
  const dynamicPrefixes = new Set()
  const toolPrefixes = new Set()
  // t('key') or t("key")
  const tRegex = /\b(?:t|\$t)\s*\(\s*['"`]([^'"`$]+)['"`]/g
  // i18nKey: 'xxx' and labelKey: 'xxx' in registry/config files
  const keyRegex = /\b(?:i18nKey|labelKey)\s*:\s*['"`]([^'"`]+)['"`]/g
  // t(`app.badges.${name}`) style dynamic prefixes
  const dynamicPrefixRegex = /\b(?:t|\$t)\s*\(\s*`([^`$]+)\$\{/g
  // domainI18nKeys maps domain names to nav group keys used indirectly
  const domainKeyRegex = /:\s*['"`](nav\.groups\.[^'"`]+)['"`]/g

  let m
  while ((m = tRegex.exec(content))) keys.add(m[1])
  while ((m = keyRegex.exec(content))) {
    keys.add(m[1])
    if (m[1].startsWith('tools.')) toolPrefixes.add(m[1])
  }
  while ((m = dynamicPrefixRegex.exec(content))) dynamicPrefixes.add(m[1].replace(/\.$/, ''))
  while ((m = domainKeyRegex.exec(content))) keys.add(m[1])

  return { keys, dynamicPrefixes, toolPrefixes }
}

function stripLineCommentOutsideStrings(line) {
  let quote = ''
  let escaped = false
  for (let i = 0; i < line.length - 1; i++) {
    const ch = line[i]
    const next = line[i + 1]

    if (escaped) {
      escaped = false
      continue
    }

    if (quote) {
      if (ch === '\\') {
        escaped = true
      } else if (ch === quote) {
        quote = ''
      }
      continue
    }

    if (ch === '\'' || ch === '"' || ch === '`') {
      quote = ch
      continue
    }

    if (ch === '/' && next === '/') {
      return line.slice(0, i)
    }
  }
  return line
}

function normalizeLineForChineseCheck(line) {
  return stripLineCommentOutsideStrings(line).replace(/<!--.*?-->/g, '').replace(/\/\*.*?\*\//g, '')
}

// 检测硬编码的中文字符串（在 template 文本节点和属性中）
function findHardcodedChinese(content) {
  const issues = []
  // 匹配 Vue template 中的纯文本节点（中文字符 ≥2）
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = normalizeLineForChineseCheck(lines[i])
    // 跳过注释、import、export、console、script setup 标签行
    if (/^\s*$/.test(line) || /^\s*\/\//.test(line) || /^\s*\*/.test(line) || /^\s*<!--/.test(line) || /import\s/.test(line) || /export\s/.test(line)) continue
    // 检测中文文本（不在 t() 或 $t() 调用中）
    const chinesePattern = /[\u4e00-\u9fff]{2,}[^\u4e00-\u9fff`'"()]*/g
    let m
    while ((m = chinesePattern.exec(line))) {
      const text = m[0].trim()
      if (text.length < 2) continue
      // 检查是否在 t() 或 $t() 包裹中
      const before = line.slice(0, m.index)
      const after = line.slice(m.index + m[0].length)
      if (before.match(/\bt\s*\(\s*['"`]$/) || before.match(/\$t\s*\(\s*['"`]$/)) continue
      if (after.match(/^['"`]\)/)) continue
      // 跳过 console.error/log 中的中文（调试信息）
      if (/console\.(error|warn|log|debug)/.test(line)) continue
      // 跳过注释
      if (before.trim().startsWith('//') || before.includes('/*')) continue
      // 跳过 import 路径
      if (/^import\s/.test(line.trim())) continue
      issues.push({ line: i + 1, text, file: '' })
    }
  }
  return issues
}

// 主流程
function main() {
  console.log('🔍 i18n 覆盖率检查\n')

  const sourceFiles = collectSourceFiles(SRC)
  const vueFiles = sourceFiles.filter((file) => file.endsWith('.vue'))
  console.log(`找到 ${sourceFiles.length} 个源码文件，其中 ${vueFiles.length} 个 Vue 文件\n`)

  // 加载 locale 文件
  let zhCN, enUS
  try {
    const zhPath = resolve(LOCALE_DIR, 'zh-CN.ts')
    const enPath = resolve(LOCALE_DIR, 'en-US.ts')
    zhCN = parseLocaleFile(zhPath)
    enUS = parseLocaleFile(enPath)
  } catch (e) {
    console.error('❌ 无法加载 locale 文件:', e.message)
    process.exit(1)
  }

  const zhFlat = flattenKeys(zhCN)
  const enFlat = flattenKeys(enUS)

  const zhKeys = new Set(Object.keys(zhFlat))
  const enKeys = new Set(Object.keys(enFlat))

  // 汇总所有 Vue 文件中使用的 key
  const usedKeys = new Set()
  const dynamicPrefixes = new Set()
  const toolPrefixes = new Set()
  const hardcodedIssues = []

  for (const file of sourceFiles) {
    const content = readFileSync(file, 'utf-8')
    const usage = extractI18nUsage(content)
    const keys = usage.keys
    for (const k of keys) usedKeys.add(k)
    for (const prefix of usage.dynamicPrefixes) dynamicPrefixes.add(prefix)
    for (const prefix of usage.toolPrefixes) toolPrefixes.add(prefix)

    if (file.endsWith('.vue')) {
      const issues = findHardcodedChinese(content)
      for (const issue of issues) {
        issue.file = file.replace(ROOT, '')
        hardcodedIssues.push(issue)
      }
    }
  }

  for (const prefix of toolPrefixes) {
    usedKeys.add(`${prefix}.title`)
    usedKeys.add(`${prefix}.desc`)
  }

  let errors = 0
  let warnings = 0

  // 1. 检查使用但未声明的 key
  console.log('═══ 使用但未在 zh-CN 中声明的 key ═══')
  const missingInZH = [...usedKeys].filter(k => !zhKeys.has(k) && !k.includes('{') && !k.startsWith('tools.'))
  for (const k of missingInZH) {
    console.log(`  ❌ missing in zh-CN: "${k}"`)
    errors++
  }
  if (!missingInZH.length) console.log('  ✅ 无遗漏')

  console.log('\n═══ 使用但未在 en-US 中声明的 key ═══')
  const missingInEN = [...usedKeys].filter(k => !enKeys.has(k) && !k.includes('{') && !k.startsWith('tools.'))
  for (const k of missingInEN) {
    console.log(`  ❌ missing in en-US: "${k}"`)
    errors++
  }
  if (!missingInEN.length) console.log('  ✅ 无遗漏')

  // 2. 检查 locale 中声明的 key 是否对称
  console.log('\n═══ zh-CN 和 en-US key 不对称检查 ═══')
  const zhOnlyKeys = [...zhKeys].filter(k => !enKeys.has(k))
  const enOnlyKeys = [...enKeys].filter(k => !zhKeys.has(k))
  for (const k of zhOnlyKeys) {
    console.log(`  ⚠️ 仅在 zh-CN 中: "${k}"`)
    warnings++
  }
  for (const k of enOnlyKeys) {
    console.log(`  ⚠️ 仅在 en-US 中: "${k}"`)
    warnings++
  }
  if (!zhOnlyKeys.length && !enOnlyKeys.length) console.log('  ✅ key 完全对称')

  // 3. 检测未使用的 key
  console.log('\n═══ 已声明但未使用的 key（可能为死代码）═══')
  const isUsedByDynamicPrefix = (key) => [...dynamicPrefixes].some((prefix) => key.startsWith(`${prefix}.`))
  const unusedZH = [...zhKeys].filter(k => !usedKeys.has(k) && !isUsedByDynamicPrefix(k) && k.split('.').length <= 3)
  const unusedToShow = showAllUnused ? unusedZH : unusedZH.slice(0, 20)
  for (const k of unusedToShow) {
    console.log(`  💤 unused: "${k}"`)
    warnings++
  }
  if (!unusedZH.length) console.log('  ✅ 无未使用的 key')
  else if (!showAllUnused && unusedZH.length > 20) console.log(`  ... 共 ${unusedZH.length} 个未使用 key（仅展示前 20 个）`)

  // 4. 检测硬编码中文
  console.log(`\n═══ 硬编码中文检测（${hardcodedIssues.length} 处）═══`)
  if (hardcodedIssues.length === 0) {
    console.log('  ✅ 未发现硬编码中文')
  } else {
    const byFile = {}
    for (const issue of hardcodedIssues) {
      if (!byFile[issue.file]) byFile[issue.file] = []
      byFile[issue.file].push(issue)
    }
    for (const [file, issues] of Object.entries(byFile)) {
      console.log(`  📄 ${file}:`)
      for (const issue of issues.slice(0, 5)) {
        console.log(`     L${issue.line}: "${issue.text}"`)
      }
      if (issues.length > 5) console.log(`     ... 共 ${issues.length} 处`)
    }
    warnings += hardcodedIssues.length
  }

  // 汇总
  console.log(`\n═══════════════════════════════════════`)
  console.log(`结果: ${errors} 个错误, ${warnings} 个警告`)
  if (errors > 0) {
    console.log('❌ 检查未通过，有缺失的 i18n key')
    process.exit(1)
  } else {
    console.log('✅ i18n 检查通过')
  }
}

// 简单的 TS 导出对象解析器
function parseLocaleFile(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  // 移除 export default 前缀
  const jsonStr = content
    .replace(/export\s+default\s+/, '')
    .replace(/\}\s*as\s+const\s*$/, '}')
    .replace(/;\s*$/, '')
    .trim()
  // 用 Function 求值（安全：仅解析项目自己的 i18n 文件）
  const fn = new Function(`return (${jsonStr})`)
  return fn()
}

main()

import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const MB = 1024 * 1024
const budgets = {
  precacheBytes: 5 * MB,
  appShellEntryBytes: 1.25 * MB,
  maxDistAssetBytes: 8 * MB,
  maxVendoredAppAssetBytes: 25 * MB,
  publicAppsBytes: 260 * MB,
}

const failures = []

function formatMB(bytes) {
  return `${(bytes / MB).toFixed(2)} MB`
}

function walkFiles(root) {
  if (!existsSync(root)) return []
  const result = []
  const walk = (path) => {
    const stat = statSync(path)
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path)) walk(join(path, entry))
      return
    }
    result.push({ path, size: stat.size })
  }
  walk(root)
  return result
}

function failIfOver(label, actual, limit) {
  if (actual > limit) {
    failures.push(`${label} 超出预算：${formatMB(actual)} > ${formatMB(limit)}`)
  }
}

function checkPrecache() {
  const swPath = join('dist', 'sw.js')
  if (!existsSync(swPath)) {
    failures.push('缺少 dist/sw.js，请先运行构建')
    return
  }

  const sw = readFileSync(swPath, 'utf8')
  const urls = [...sw.matchAll(/url:"([^"]+)"/g)].map((match) => match[1])
  const total = urls.reduce((sum, url) => {
    const filePath = join('dist', url)
    return existsSync(filePath) ? sum + statSync(filePath).size : sum
  }, 0)

  console.log(`PWA 预缓存：${formatMB(total)} / ${formatMB(budgets.precacheBytes)}`)
  failIfOver('PWA 预缓存', total, budgets.precacheBytes)
}

function checkDistAssets() {
  const files = walkFiles('dist')
  for (const file of files) {
    const rel = relative(process.cwd(), file.path)
    const isVendoredApp = rel.split(/[\\/]/).includes('apps')
    failIfOver(
      `单个构建资源 ${rel}`,
      file.size,
      isVendoredApp ? budgets.maxVendoredAppAssetBytes : budgets.maxDistAssetBytes,
    )
  }

  const appShellEntries = files.filter((file) => /[\\/]assets[\\/]index-[^\\/]+\.js$/.test(file.path))
  for (const file of appShellEntries) {
    failIfOver(`入口 JS ${relative(process.cwd(), file.path)}`, file.size, budgets.appShellEntryBytes)
  }
}

function checkPublicApps() {
  const total = walkFiles(join('public', 'apps')).reduce((sum, file) => sum + file.size, 0)
  console.log(`public/apps：${formatMB(total)} / ${formatMB(budgets.publicAppsBytes)}`)
  failIfOver('public/apps', total, budgets.publicAppsBytes)
}

checkPrecache()
checkDistAssets()
checkPublicApps()

if (failures.length) {
  console.error('构建体积预算检查失败：')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('构建体积预算检查通过')

import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const requestedRoots = process.argv.slice(2)
const roots = (requestedRoots.length ? requestedRoots : ['public']).filter((root) => existsSync(root))
const blockedDirectories = new Set(['WEB-INF', 'META-INF'])
const blockedExtensions = new Set(['.jar', '.class', '.war', '.ear'])
const blockedDocumentExtensions = new Set(['.md', '.markdown'])
const blockedNamePattern = /(?:^|[_\-.])(?:client[_-]?)?secret(?:$|[_\-.])|api[_-]?key|private[_-]?key|passwd|password/i

const findings = []

function scan(path) {
  const stat = statSync(path)
  const name = path.split(/[\\/]/).at(-1) ?? path
  const rel = relative(process.cwd(), path)

  if (stat.isDirectory()) {
    if (blockedDirectories.has(name)) {
      findings.push(`${rel}：禁止发布服务端目录`)
      return
    }
    for (const entry of readdirSync(path)) scan(join(path, entry))
    return
  }

  const lower = name.toLowerCase()
  const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.')) : ''
  if (blockedExtensions.has(ext)) findings.push(`${rel}：禁止发布 ${ext} 文件`)
  if (blockedDocumentExtensions.has(ext)) findings.push(`${rel}：维护文档不得放入公开静态资源目录`)
  if (blockedNamePattern.test(name)) findings.push(`${rel}：文件名疑似包含密钥或凭据`)
}

for (const root of roots) scan(root)

if (findings.length) {
  console.error('公开静态资源检查失败：')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log(`公开静态资源检查通过：${roots.join(', ')}`)

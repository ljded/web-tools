import { getToolFeaturePath, tools, type ToolCapability, type ToolDefinition, type ToolFeatureDefinition } from '@/tools/registry'
import type { Translate } from '@/tools/navigation'

export interface ToolSearchItem {
  tool: ToolDefinition
  feature?: ToolFeatureDefinition
  label: string
  description: string
  searchText: string
  score: number
  path: string
  featureLabel?: string
}

export interface ToolSearchOptions {
  favoriteNames?: string[]
  recentNames?: string[]
  preferredCapabilities?: ToolCapability[]
  cacheKey?: string
}

interface TokenSearchContext {
  normalized: string
  compact: string
  tokens: string[]
}

interface SearchContext extends TokenSearchContext {
  tokenContexts: TokenSearchContext[]
}

interface ToolSearchCatalog {
  rootItems: ToolSearchItem[]
  featureItems: ToolSearchItem[]
}

// 优化：添加 LRU 缓存和 TTL
interface CachedCatalog {
  catalog: ToolSearchCatalog
  timestamp: number
}

const catalogCache = new Map<string, CachedCatalog>()
const CACHE_MAX_SIZE = 50
const CACHE_TTL = 5 * 60 * 1000 // 5分钟

function normalize(value: string) {
  return value.trim().toLocaleLowerCase()
}

function compact(value: string) {
  return normalize(value).replace(/[\s._\/\\,，、:：|-]+/g, '')
}

function tokenize(value: string) {
  return normalize(value).split(/[\s,，、\/\\|]+/).filter(Boolean)
}

function prepareQuery(query: string): SearchContext {
  const normalized = normalize(query)
  const compactQuery = compact(query)
  const tokens = normalized ? tokenize(normalized) : []
  return {
    normalized,
    compact: compactQuery,
    tokens,
    tokenContexts: tokens.map((token) => ({
      normalized: token,
      compact: compact(token),
      tokens: [token],
    })),
  }
}

function scoreText(field: string, context: TokenSearchContext, exactScore: number, startsWithScore: number, includesScore: number) {
  if (!context.normalized) return 0

  const normalized = normalize(field)
  const compactField = compact(field)
  if (normalized === context.normalized || compactField === context.compact) return exactScore
  if (normalized.startsWith(context.normalized)) return startsWithScore
  if (context.compact && compactField.startsWith(context.compact)) return Math.round(startsWithScore * 0.92)
  if (normalized.includes(context.normalized)) return includesScore
  if (context.compact && compactField.includes(context.compact)) return Math.round(includesScore * 0.85)
  return 0
}

function createSearchText(tool: ToolDefinition, label: string, description: string, feature?: ToolFeatureDefinition, featureLabel = '') {
  return [
    tool.name,
    label,
    description,
    featureLabel,
    ...(tool.keywords ?? []),
    ...(feature?.keywords ?? []),
    ...(tool.tags ?? []),
    ...(tool.capabilities ?? []),
    tool.domain,
    tool.status ?? '',
    tool.hotkey ?? '',
  ]
    .join(' ')
    .toLocaleLowerCase()
}

function scoreToolText(tool: ToolDefinition, label: string, description: string, context: TokenSearchContext) {
  let score = 0
  score += scoreText(tool.name, context, 120, 90, 55)
  score += scoreText(label, context, 110, 85, 50)
  score += scoreText(description, context, 40, 30, 18)
  score += (tool.keywords ?? []).reduce((total, keyword) => total + scoreText(keyword, context, 75, 55, 35), 0)
  score += (tool.tags ?? []).reduce((total, tag) => total + scoreText(tag, context, 38, 28, 18), 0)
  score += (tool.capabilities ?? []).reduce((total, capability) => total + scoreText(capability, context, 28, 18, 12), 0)
  score += scoreText(tool.domain, context, 20, 12, 8)
  score += scoreText(tool.status ?? '', context, 16, 12, 8)
  score += scoreText(tool.hotkey ?? '', context, 16, 12, 8)
  return score
}

function scoreFeatureText(feature: ToolFeatureDefinition | undefined, featureLabel: string, context: TokenSearchContext) {
  if (!feature) return 0
  let score = scoreText(featureLabel, context, 125, 98, 68)
  score += (feature.keywords ?? []).reduce((total, keyword) => total + scoreText(keyword, context, 92, 70, 45), 0)
  return score
}

function scoreItem(item: ToolSearchItem, context: SearchContext, options: ToolSearchOptions) {
  const featureLabel = item.featureLabel ?? ''
  const directFeatureScore = scoreFeatureText(item.feature, featureLabel, context)
  let score = scoreToolText(item.tool, item.label, item.description, context) + directFeatureScore

  if (context.tokenContexts.length > 1) {
    const tokenScores = context.tokenContexts.map((tokenContext) =>
      scoreToolText(item.tool, item.label, item.description, tokenContext) + scoreFeatureText(item.feature, featureLabel, tokenContext),
    )
    if (tokenScores.some((tokenScore) => tokenScore <= 0)) return 0
    score += Math.round(tokenScores.reduce((total, tokenScore) => total + tokenScore, 0) * 0.6)
  }

  if (item.feature) {
    const tokenFeatureScore = context.tokenContexts.reduce((total, tokenContext) => total + scoreFeatureText(item.feature, featureLabel, tokenContext), 0)
    if (context.normalized && directFeatureScore <= 0 && tokenFeatureScore <= 0) return 0
    score += 28
  }

  if (context.normalized && score <= 0) return 0

  const favoriteIndex = options.favoriteNames?.indexOf(item.tool.name) ?? -1
  if (favoriteIndex >= 0) score += Math.max(8, 32 - favoriteIndex * 3)

  const recentIndex = options.recentNames?.indexOf(item.tool.name) ?? -1
  if (recentIndex >= 0) score += Math.max(4, 24 - recentIndex * 2)

  for (const capability of options.preferredCapabilities ?? []) {
    if (item.tool.capabilities?.includes(capability)) score += 6
  }

  if (!context.normalized) score += tools.length - tools.indexOf(item.tool)
  return score
}

function scoreItems(items: ToolSearchItem[], context: SearchContext, options: ToolSearchOptions) {
  return items
    .map((item) => ({
      ...item,
      score: scoreItem(item, context, options),
    }))
    .filter((item) => item.score > 0 || (!item.feature && item.searchText.includes(context.normalized)))
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
}

function createRootItem(t: Translate, tool: ToolDefinition): ToolSearchItem {
  const label = t(`${tool.i18nKey}.title`)
  const description = t(`${tool.i18nKey}.desc`)
  return {
    tool,
    label,
    description,
    searchText: createSearchText(tool, label, description),
    score: 0,
    path: tool.path,
  }
}

function createFeatureItems(t: Translate, tool: ToolDefinition): ToolSearchItem[] {
  const toolLabel = t(`${tool.i18nKey}.title`)
  const description = t(`${tool.i18nKey}.desc`)

  return (tool.features ?? []).map((feature) => {
    const featureLabel = t(feature.labelKey)
    const label = `${toolLabel} / ${featureLabel}`
    return {
      tool,
      feature,
      label,
      description,
      featureLabel,
      searchText: createSearchText(tool, toolLabel, description, feature, featureLabel),
      score: 0,
      path: getToolFeaturePath(tool, feature),
    }
  })
}

function getSearchCatalog(t: Translate, cacheKey = 'default'): ToolSearchCatalog {
  // 优化：检查缓存是否过期
  const cached = catalogCache.get(cacheKey)
  if (cached) {
    const age = Date.now() - cached.timestamp
    if (age < CACHE_TTL) {
      return cached.catalog
    }
    // 过期，删除缓存
    catalogCache.delete(cacheKey)
  }

  // 优化：LRU - 限制缓存大小
  if (catalogCache.size >= CACHE_MAX_SIZE) {
    // 删除最旧的条目
    let oldestKey: string | null = null
    let oldestTime = Infinity
    for (const [key, entry] of catalogCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }
    if (oldestKey) catalogCache.delete(oldestKey)
  }

  const rootItems = tools.map((tool) => createRootItem(t, tool))
  const featureItems = tools.flatMap((tool) => createFeatureItems(t, tool))
  const catalog = { rootItems, featureItems }
  catalogCache.set(cacheKey, { catalog, timestamp: Date.now() })
  return catalog
}

export function createToolSearchItems(t: Translate, options: ToolSearchOptions = {}): ToolSearchItem[] {
  return scoreItems(getSearchCatalog(t, options.cacheKey).rootItems, prepareQuery(''), options)
}

export function searchTools(t: Translate, query: string, options: ToolSearchOptions = {}): ToolSearchItem[] {
  const context = prepareQuery(query)
  const catalog = getSearchCatalog(t, options.cacheKey)
  if (!context.normalized) return scoreItems(catalog.rootItems, context, options)

  return scoreItems([...catalog.rootItems, ...catalog.featureItems], context, options)
}

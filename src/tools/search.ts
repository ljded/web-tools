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
}

export interface ToolSearchOptions {
  favoriteNames?: string[]
  recentNames?: string[]
  preferredCapabilities?: ToolCapability[]
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase()
}

function compact(value: string) {
  return normalize(value).replace(/[\s._\/\\,，、:：|-]+/g, '')
}

function tokenize(value: string) {
  return normalize(value).split(/[\s,，、\/\\|]+/).filter(Boolean)
}

function scoreText(field: string, query: string, exactScore: number, startsWithScore: number, includesScore: number) {
  const normalized = normalize(field)
  const compactField = compact(field)
  const compactQuery = compact(query)
  if (!query) return 0
  if (normalized === query || compactField === compactQuery) return exactScore
  if (normalized.startsWith(query)) return startsWithScore
  if (compactQuery && compactField.startsWith(compactQuery)) return Math.round(startsWithScore * 0.92)
  if (normalized.includes(query)) return includesScore
  if (compactQuery && compactField.includes(compactQuery)) return Math.round(includesScore * 0.85)
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

function scoreToolText(tool: ToolDefinition, label: string, description: string, query: string) {
  let score = 0
  score += scoreText(tool.name, query, 120, 90, 55)
  score += scoreText(label, query, 110, 85, 50)
  score += scoreText(description, query, 40, 30, 18)
  score += (tool.keywords ?? []).reduce((total, keyword) => total + scoreText(keyword, query, 75, 55, 35), 0)
  score += (tool.tags ?? []).reduce((total, tag) => total + scoreText(tag, query, 38, 28, 18), 0)
  score += (tool.capabilities ?? []).reduce((total, capability) => total + scoreText(capability, query, 28, 18, 12), 0)
  score += scoreText(tool.domain, query, 20, 12, 8)
  score += scoreText(tool.status ?? '', query, 16, 12, 8)
  score += scoreText(tool.hotkey ?? '', query, 16, 12, 8)
  return score
}

function scoreFeatureText(feature: ToolFeatureDefinition | undefined, featureLabel: string, query: string) {
  if (!feature) return 0
  let score = scoreText(featureLabel, query, 125, 98, 68)
  score += (feature.keywords ?? []).reduce((total, keyword) => total + scoreText(keyword, query, 92, 70, 45), 0)
  return score
}

function scoreItem(item: ToolSearchItem, query: string, options: ToolSearchOptions) {
  const tokens = tokenize(query)
  const featureLabel = item.feature ? item.label.split(' / ').at(-1) ?? item.label : ''
  const directFeatureScore = scoreFeatureText(item.feature, featureLabel, query)
  let score = scoreToolText(item.tool, item.label, item.description, query) + directFeatureScore

  if (tokens.length > 1) {
    const tokenScores = tokens.map((token) => scoreToolText(item.tool, item.label, item.description, token) + scoreFeatureText(item.feature, featureLabel, token))
    if (tokenScores.some((tokenScore) => tokenScore <= 0)) return 0
    score += Math.round(tokenScores.reduce((total, tokenScore) => total + tokenScore, 0) * 0.6)
  }

  if (item.feature) {
    const tokenFeatureScore = tokens.reduce((total, token) => total + scoreFeatureText(item.feature, featureLabel, token), 0)
    if (query && directFeatureScore <= 0 && tokenFeatureScore <= 0) return 0
    score += 28
  }

  if (query && score <= 0) return 0

  const favoriteIndex = options.favoriteNames?.indexOf(item.tool.name) ?? -1
  if (favoriteIndex >= 0) score += Math.max(8, 32 - favoriteIndex * 3)

  const recentIndex = options.recentNames?.indexOf(item.tool.name) ?? -1
  if (recentIndex >= 0) score += Math.max(4, 24 - recentIndex * 2)

  for (const capability of options.preferredCapabilities ?? []) {
    if (item.tool.capabilities?.includes(capability)) score += 6
  }

  if (!query) score += tools.length - tools.indexOf(item.tool)
  return score
}

function createRootItem(t: Translate, tool: ToolDefinition, options: ToolSearchOptions): ToolSearchItem {
  const label = t(`${tool.i18nKey}.title`)
  const description = t(`${tool.i18nKey}.desc`)
  const item: ToolSearchItem = {
    tool,
    label,
    description,
    searchText: createSearchText(tool, label, description),
    score: 0,
    path: tool.path,
  }
  item.score = scoreItem(item, '', options)
  return item
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
      searchText: createSearchText(tool, toolLabel, description, feature, featureLabel),
      score: 0,
      path: getToolFeaturePath(tool, feature),
    }
  })
}

export function createToolSearchItems(t: Translate, options: ToolSearchOptions = {}): ToolSearchItem[] {
  return tools.map((tool) => createRootItem(t, tool, options)).sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
}

export function searchTools(t: Translate, query: string, options: ToolSearchOptions = {}): ToolSearchItem[] {
  const normalized = normalize(query)
  const items = createToolSearchItems(t, options)
  if (!normalized) return items

  return [
    ...items,
    ...tools.flatMap((tool) => createFeatureItems(t, tool)),
  ]
    .map((item) => ({
      ...item,
      score: scoreItem(item, normalized, options),
    }))
    .filter((item) => item.score > 0 || (!item.feature && item.searchText.includes(normalized)))
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
}

import { tools, type ToolCapability, type ToolDefinition } from '@/tools/registry'
import type { Translate } from '@/tools/navigation'

export interface ToolSearchItem {
  tool: ToolDefinition
  label: string
  description: string
  searchText: string
  score: number
}

export interface ToolSearchOptions {
  favoriteNames?: string[]
  recentNames?: string[]
  preferredCapabilities?: ToolCapability[]
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase()
}

function scoreText(field: string, query: string, exactScore: number, startsWithScore: number, includesScore: number) {
  const normalized = normalize(field)
  if (!query) return 0
  if (normalized === query) return exactScore
  if (normalized.startsWith(query)) return startsWithScore
  if (normalized.includes(query)) return includesScore
  return 0
}

function createSearchText(tool: ToolDefinition, label: string, description: string) {
  return [
    tool.name,
    label,
    description,
    ...(tool.keywords ?? []),
    ...(tool.tags ?? []),
    ...(tool.capabilities ?? []),
    tool.domain,
    tool.status ?? '',
    tool.hotkey ?? '',
  ]
    .join(' ')
    .toLocaleLowerCase()
}

function scoreTool(tool: ToolDefinition, label: string, description: string, query: string, options: ToolSearchOptions) {
  let score = 0
  score += scoreText(tool.name, query, 120, 90, 55)
  score += scoreText(label, query, 110, 85, 50)
  score += scoreText(description, query, 40, 30, 18)
  score += (tool.keywords ?? []).reduce((total, keyword) => total + scoreText(keyword, query, 75, 55, 35), 0)
  score += (tool.tags ?? []).reduce((total, tag) => total + scoreText(tag, query, 38, 28, 18), 0)
  score += (tool.capabilities ?? []).reduce((total, capability) => total + scoreText(capability, query, 28, 18, 12), 0)
  score += scoreText(tool.domain, query, 20, 12, 8)

  const favoriteIndex = options.favoriteNames?.indexOf(tool.name) ?? -1
  if (favoriteIndex >= 0) score += Math.max(8, 32 - favoriteIndex * 3)

  const recentIndex = options.recentNames?.indexOf(tool.name) ?? -1
  if (recentIndex >= 0) score += Math.max(4, 24 - recentIndex * 2)

  for (const capability of options.preferredCapabilities ?? []) {
    if (tool.capabilities?.includes(capability)) score += 6
  }

  if (!query) score += tools.length - tools.indexOf(tool)
  return score
}

export function createToolSearchItems(t: Translate, options: ToolSearchOptions = {}): ToolSearchItem[] {
  return tools.map((tool) => {
    const label = t(`${tool.i18nKey}.title`)
    const description = t(`${tool.i18nKey}.desc`)
    const searchText = createSearchText(tool, label, description)
    const score = scoreTool(tool, label, description, '', options)

    return { tool, label, description, searchText, score }
  }).sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
}

export function searchTools(t: Translate, query: string, options: ToolSearchOptions = {}): ToolSearchItem[] {
  const normalized = normalize(query)
  const items = createToolSearchItems(t, options)
  if (!normalized) return items

  return items
    .map((item) => ({
      ...item,
      score: scoreTool(item.tool, item.label, item.description, normalized, options),
    }))
    .filter((item) => item.score > 0 || item.searchText.includes(normalized))
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
}

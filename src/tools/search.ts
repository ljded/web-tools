import { tools, type ToolDefinition } from '@/tools/registry'
import type { Translate } from '@/tools/navigation'

export interface ToolSearchItem {
  tool: ToolDefinition
  label: string
  description: string
  searchText: string
}

export function createToolSearchItems(t: Translate): ToolSearchItem[] {
  return tools.map((tool) => {
    const label = t(`${tool.i18nKey}.title`)
    const description = t(`${tool.i18nKey}.desc`)
    const searchText = [
      tool.name,
      label,
      description,
      ...(tool.keywords ?? []),
      ...(tool.tags ?? []),
      ...(tool.capabilities ?? []),
    ]
      .join(' ')
      .toLocaleLowerCase()

    return { tool, label, description, searchText }
  })
}

export function searchTools(t: Translate, query: string): ToolSearchItem[] {
  const normalized = query.trim().toLocaleLowerCase()
  const items = createToolSearchItems(t)
  if (!normalized) return items

  return items.filter((item) => item.searchText.includes(normalized))
}

import { domainI18nKeys, tools, type ToolDomain } from '@/tools/registry'

export interface AppNavigationItem {
  label: string
  icon?: string
  to?: string
  type?: 'trigger'
  active?: boolean
  defaultOpen?: boolean
  children?: AppNavigationItem[]
  onSelect?: () => void
}

export interface AppNavigationGroup {
  label: string
  domain: ToolDomain
  items: AppNavigationItem[]
}

export type Translate = (key: string, options?: Record<string, unknown>) => string

export const toolDomainOrder: ToolDomain[] = ['dev', 'text', 'crypto', 'media']

export function createNavigationGroups(t: Translate, currentPath: string): AppNavigationGroup[] {
  return toolDomainOrder.map((domain) => ({
    label: t(domainI18nKeys[domain]),
    domain,
    items: tools
      .filter((tool) => tool.domain === domain)
      .map((tool) => ({
        label: t(`${tool.i18nKey}.title`),
        icon: tool.icon,
        to: tool.path,
        active: currentPath === tool.path,
      })),
  }))
}

export function createAppNavigation(
  t: Translate,
  currentPath: string,
  onNavigate?: () => void,
): AppNavigationItem[] {
  return [
    {
      label: t('nav.home'),
      icon: 'i-lucide-home',
      to: '/',
      active: currentPath === '/',
      onSelect: onNavigate,
    },
    ...createNavigationGroups(t, currentPath).map((group) => ({
      label: group.label,
      type: 'trigger' as const,
      active: group.items.some((item) => item.active),
      defaultOpen: group.items.some((item) => item.active),
      children: group.items.map((item) => ({
        ...item,
        onSelect: onNavigate,
      })),
    })),
  ]
}

export function getCurrentNavigationTitle(t: Translate, currentPath: string): string {
  if (currentPath === '/') return t('nav.home')

  const currentTool = tools.find((tool) => tool.path === currentPath)
  return currentTool ? t(`${currentTool.i18nKey}.title`) : t('app.title')
}

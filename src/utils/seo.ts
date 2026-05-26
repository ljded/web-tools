import type { Router } from 'vue-router'
import { i18n } from '@/i18n'

const siteName = 'Web Tools'
const defaultTitle = 'Web Tools - 本地优先的网页工具集'
const defaultDescription = 'Web Tools 是本地优先、支持离线回访的在线工具集，提供 JSON 格式化、加解密、哈希、Base64、时间戳、二维码、图片、PDF、正则、计时器等常用网页工具。'
const defaultKeywords = 'Web Tools,在线工具,本地工具,离线工具,JSON格式化,加密解密,哈希,Base64,时间戳,二维码,图片压缩,PDF工具,正则表达式,计时器'

function setMeta(selector: string, attrs: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    if (attrs.name) element.setAttribute('name', attrs.name)
    if (attrs.property) element.setAttribute('property', attrs.property)
    document.head.appendChild(element)
  }

  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value)
  }
}

function setCanonical() {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = window.location.href.split('?')[0] ?? window.location.href
}

function routeText(i18nKey?: unknown) {
  if (typeof i18nKey !== 'string') {
    return {
      title: defaultTitle,
      description: defaultDescription,
    }
  }

  const t = i18n.global.t
  const title = t(`${i18nKey}.title`)
  const description = t(`${i18nKey}.desc`)

  return {
    title: `${title} - ${siteName}`,
    description: `${description}。${defaultDescription}`,
  }
}

export function installRouteSeo(router: Router) {
  router.afterEach((route) => {
    const { title, description } = route.name === 'home'
      ? { title: defaultTitle, description: defaultDescription }
      : routeText(route.meta.i18nKey)
    const keywords = Array.isArray(route.meta.keywords) && route.meta.keywords.length
      ? [...route.meta.keywords, siteName, '在线工具', '离线工具'].join(',')
      : defaultKeywords

    document.title = title
    setMeta('meta[name="description"]', { name: 'description', content: description })
    setMeta('meta[name="keywords"]', { name: 'keywords', content: keywords })
    setMeta('meta[property="og:title"]', { property: 'og:title', content: title })
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description })
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title })
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description })
    setCanonical()
  })
}

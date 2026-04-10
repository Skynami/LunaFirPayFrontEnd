import api from './api'

const DEFAULT_SITE_CONFIG = {
  siteName: '支付平台'
}

let cachedSiteConfig = { ...DEFAULT_SITE_CONFIG }
let loadingPromise = null

function normalizeConfig(raw) {
  return {
    siteName: raw?.siteName || DEFAULT_SITE_CONFIG.siteName
  }
}

async function fetchFromSiteConfigFile() {
  const response = await fetch('/site-config.json', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error('site-config.json not found')
  }
  return response.json()
}

async function fetchFromApi() {
  const response = await api.get('/api/system/config')
  if (response?.data?.code !== 0) {
    throw new Error(response?.data?.msg || 'load /api/system/config failed')
  }
  return response.data.data || {}
}

export async function loadSiteConfig(force = false) {
  if (!force && loadingPromise) {
    return loadingPromise
  }

  loadingPromise = (async () => {
    try {
      // 优先使用实时接口配置，避免开发环境静态文件内容滞后
      const apiConfig = await fetchFromApi()
      cachedSiteConfig = normalizeConfig(apiConfig)
      return cachedSiteConfig
    } catch (apiError) {
      try {
        const fileConfig = await fetchFromSiteConfigFile()
        cachedSiteConfig = normalizeConfig(fileConfig)
        return cachedSiteConfig
      } catch (fileError) {
        cachedSiteConfig = { ...DEFAULT_SITE_CONFIG }
        return cachedSiteConfig
      }
    }
  })()

  return loadingPromise
}

export function getSiteConfig() {
  return cachedSiteConfig
}

export default {
  loadSiteConfig,
  getSiteConfig
}

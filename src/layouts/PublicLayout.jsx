import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import PublicHeader from '../components/PublicHeader'
import { loadSiteConfig } from '../utils/siteConfig'

function PublicLayout() {
  useEffect(() => {
    let mounted = true

    loadSiteConfig().then((config) => {
      if (mounted && config?.siteName) {
        document.title = config.siteName
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <>
      <PublicHeader />
      <Outlet />
    </>
  )
}

export default PublicLayout
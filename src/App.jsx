import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useUserStore } from './stores/userStore'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ApiDoc from './pages/ApiDoc'
import TestPay from './pages/TestPay'
import PublicLayout from './layouts/PublicLayout'
import MerchantLayout from './layouts/MerchantLayout'
import ProviderLayout from './layouts/ProviderLayout'
import MerchantOverview from './pages/merchant/Overview'
import MerchantOrders from './pages/merchant/Orders'
import MerchantServices from './pages/merchant/Services'
import MerchantRAM from './pages/merchant/RAM'
import MerchantSettlements from './pages/merchant/Settlements'
import MerchantDomains from './pages/merchant/Domains'
import ProviderOverview from './pages/provider/Overview'
import ProviderOrders from './pages/provider/Orders'
import ProviderMerchants from './pages/provider/Merchants'
import ProviderChannels from './pages/provider/Channels'
import ProviderPayGroups from './pages/provider/PayGroups'
import ProviderProfile from './pages/provider/Profile'
import ProviderRAM from './pages/provider/RAM'
import ProviderSettlements from './pages/provider/Settlements'
import ProviderDomains from './pages/provider/Domains'
import ProviderAnnouncements from './pages/provider/Announcements'
import { loadSiteConfig } from './utils/siteConfig'

// 路由守卫组件
function ProtectedRoute({ children, userType }) {
  const isLoggedIn = useUserStore((state) => state.isLoggedIn)
  const isRam = useUserStore((state) => state.isRam)
  const ramInfo = useUserStore((state) => state.ramInfo)
  const currentUserType = useUserStore((state) => state.userType)
  
  if (!isLoggedIn) {
    // 未登录，跳转到对应类型的登录页
    const loginType = userType === 'admin' ? 'admin' : userType
    return <Navigate to={`/login?type=${loginType}`} replace />
  }
  
  // RAM 用户只能访问其 ownerType 对应的平台
  if (isRam && ramInfo) {
    const allowedPlatform = ramInfo.ownerType  // 'merchant' 或 'admin'
    if (userType && userType !== allowedPlatform) {
      // RAM 用户尝试访问不属于他们的平台，重定向到正确的平台
      const redirectPath = allowedPlatform === 'admin' ? '/admin' : '/merchant'
      return <Navigate to={redirectPath} replace />
    }
  } else {
    // 普通用户只能访问其注册类型对应的平台
    if (userType && currentUserType && userType !== currentUserType) {
      // 用户尝试访问不属于他们的平台，重定向到正确的平台
      const redirectPath = currentUserType === 'admin' ? '/admin' : '/merchant'
      return <Navigate to={redirectPath} replace />
    }
  }
  
  return children
}

// 已登录用户访问登录/注册页面时重定向
function GuestRoute({ children }) {
  const isLoggedIn = useUserStore((state) => state.isLoggedIn)
  const isRam = useUserStore((state) => state.isRam)
  const ramInfo = useUserStore((state) => state.ramInfo)
  const userType = useUserStore((state) => state.userType)
  
  if (isLoggedIn) {
    // RAM 用户根据 ownerType 重定向到对应平台
    if (isRam && ramInfo) {
      const platform = ramInfo.ownerType === 'admin' ? '/admin' : '/merchant'
      return <Navigate to={platform} replace />
    }
    // 普通用户根据 userType 重定向
    const platform = userType === 'admin' ? '/admin' : '/merchant'
    return <Navigate to={platform} replace />
  }
  
  return children
}

function App() {
  const [loading, setLoading] = useState(true)
  const checkAuth = useUserStore((state) => state.checkAuth)

  useEffect(() => {
    const initAuth = async () => {
      // 使用 cookie 认证，不需要检查 localStorage
      await checkAuth()
      setLoading(false)
    }
    initAuth()
  }, [])

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

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <Spin size="large" />
        <span style={{ color: '#666' }}>加载中...</span>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/doc" element={<ApiDoc />} />
        <Route path="/test-pay" element={<TestPay />} />
      </Route>
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      
      {/* 商户平台路由 */}
      <Route 
        path="/merchant" 
        element={
          <ProtectedRoute userType="merchant">
            <MerchantLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/merchant/overview" replace />} />
        <Route path="overview" element={<MerchantOverview />} />
        <Route path="orders" element={<MerchantOrders />} />
        <Route path="services" element={<MerchantServices />} />
        <Route path="profile" element={<Navigate to="/merchant/services" replace />} />
        <Route path="ram" element={<MerchantRAM />} />
        <Route path="settlements" element={<MerchantSettlements />} />
        <Route path="domains" element={<MerchantDomains />} />
      </Route>
      
      {/* 管理后台路由 */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute userType="admin">
            <ProviderLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/overview" replace />} />
        <Route path="overview" element={<ProviderOverview />} />
        <Route path="orders" element={<ProviderOrders />} />
        <Route path="merchants" element={<ProviderMerchants />} />
        <Route path="channels" element={<ProviderChannels />} />
        <Route path="paygroups" element={<ProviderPayGroups />} />
        <Route path="profile" element={<ProviderProfile />} />
        <Route path="ram" element={<ProviderRAM />} />
        <Route path="settlements" element={<ProviderSettlements />} />
        <Route path="domains" element={<ProviderDomains />} />
        <Route path="announcements" element={<ProviderAnnouncements />} />
      </Route>
      
      {/* 兼容旧的 /provider 路由，重定向到 /admin */}
      <Route path="/provider/*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

export default App

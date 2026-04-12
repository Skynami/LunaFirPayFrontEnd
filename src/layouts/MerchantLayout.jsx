import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { Layout, Menu, Button, Dropdown, Tag, message, Drawer } from 'antd'
import { 
  BarChartOutlined, 
  UnorderedListOutlined, 
  LinkOutlined, 
  TeamOutlined,
  DownOutlined,
  HomeOutlined,
  LogoutOutlined,
  WalletOutlined,
  MenuOutlined,
  CloseOutlined,
  GlobalOutlined,
  QrcodeOutlined
} from '@ant-design/icons'
import { useUserStore } from '../stores/userStore'
import { useIsMobile } from '../utils/useIsMobile'
import api from '../utils/api'

const { Sider, Header, Content } = Layout

function MerchantLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isRam, ramInfo, hasRamPermission, logout } = useUserStore()
  const isMobile = useIsMobile()
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [directPayFeatureEnabled, setDirectPayFeatureEnabled] = useState(true)

  useEffect(() => {
    const loadSystemConfig = async () => {
      try {
        const res = await api.get('/api/system/config')
        if (res?.data?.code === 0) {
          setDirectPayFeatureEnabled(res.data.data?.directPayFeatureEnabled !== false)
        }
      } catch (error) {
        setDirectPayFeatureEnabled(true)
      }
    }
    loadSystemConfig()
  }, [])

  // RAM 子账户的权限检查
  const canViewOrders = !isRam || hasRamPermission('order')
  const canViewFinance = !isRam || hasRamPermission('finance')
  const canViewSettings = !isRam || hasRamPermission('settings')

  const menuItems = [
    {
      key: '/merchant/overview',
      icon: <BarChartOutlined />,
      label: '平台概览'
    },
    // 交易流水需要 order 权限
    ...(canViewOrders ? [{
      key: '/merchant/orders',
      icon: <UnorderedListOutlined />,
      label: '交易流水'
    }] : []),
    // 服务管理（包含个人资料功能）
    {
      key: '/merchant/services',
      icon: <LinkOutlined />,
      label: '服务管理'
    },
    // 直接收款管理
    ...(directPayFeatureEnabled ? [{
      key: '/merchant/direct',
      icon: <QrcodeOutlined />,
      label: '直接收款'
    }] : []),
    // 结算设置需要 finance 或 settings 权限
    ...(canViewFinance || canViewSettings ? [{
      key: '/merchant/settlements',
      icon: <WalletOutlined />,
      label: '结算设置'
    }] : []),
    // 域名白名单
    {
      key: '/merchant/domains',
      icon: <GlobalOutlined />,
      label: '域名白名单'
    },
    // RAM 子账户不显示 RAM 管理菜单
    ...(!isRam ? [{
      key: '/merchant/ram',
      icon: <TeamOutlined />,
      label: 'RAM管理'
    }] : [])
  ]

  const handleMenuClick = ({ key }) => {
    navigate(key)
    if (isMobile) {
      setDrawerVisible(false)
    }
  }

  const handleCommand = (key) => {
    if (key === 'logout') {
      logout()
      message.success('已退出登录')
      navigate('/')
    } else if (key === 'home') {
      navigate('/')
    }
  }

  const dropdownItems = [
    { key: 'home', icon: <HomeOutlined />, label: '返回首页' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }
  ]

  // 侧边栏内容组件
  const SiderContent = () => (
    <>
      <div style={{
        height: 60,
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 18,
        fontWeight: 600,
        color: 'var(--primary-color)',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <span>商户平台</span>
        {isMobile && (
          <Button 
            type="text" 
            icon={<CloseOutlined />} 
            onClick={() => setDrawerVisible(false)}
          />
        )}
      </div>
      
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ borderRight: 'none', flex: 1 }}
      />
    </>
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <Sider 
          width={220} 
          style={{ 
            background: '#fff', 
            borderRight: '1px solid var(--border-color)',
            position: 'fixed',
            left: 0,
            top: 0,
            height: '100vh',
            zIndex: 100
          }}
        >
          <SiderContent />
        </Sider>
      )}

      {/* 移动端抽屉侧边栏 */}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          width={260}
          closable={false}
          styles={{ body: { padding: 0, position: 'relative', height: '100%' } }}
        >
          <SiderContent />
        </Drawer>
      )}
      
      <Layout style={{ marginLeft: isMobile ? 0 : 220, flex: 1, minWidth: 0 }}>
        <Header style={{
          height: 60,
          background: '#fff',
          borderBottom: '1px solid var(--border-color)',
          padding: isMobile ? '0 12px' : '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <Button 
                type="text" 
                icon={<MenuOutlined style={{ fontSize: 20 }} />} 
                onClick={() => setDrawerVisible(true)}
                className="hamburger-btn"
              />
            )}
            {isRam && ramInfo && (
              <>
                <Tag color="orange">子账户</Tag>
                {!isMobile && <span style={{ marginLeft: 8 }}>{ramInfo.displayName || ramInfo.ownerName}</span>}
              </>
            )}
          </div>
          <Dropdown
            menu={{
              items: dropdownItems,
              onClick: ({ key }) => handleCommand(key)
            }}
          >
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              {user?.username}
              <DownOutlined />
            </span>
          </Dropdown>
        </Header>
        
        <Content style={{ padding: isMobile ? 12 : 24, background: 'var(--bg-color)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MerchantLayout

import { useState } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { Layout, Menu, Button, Dropdown, Tag, message, Drawer } from 'antd'
import { 
  BarChartOutlined, 
  UnorderedListOutlined, 
  TeamOutlined, 
  UserOutlined,
  ApiOutlined,
  ShareAltOutlined,
  DownOutlined,
  HomeOutlined,
  LogoutOutlined,
  AppstoreOutlined,
  MenuOutlined,
  CloseOutlined,
  WalletOutlined,
  GlobalOutlined,
  NotificationOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import { useUserStore } from '../stores/userStore'
import { useIsMobile } from '../utils/useIsMobile'

const { Sider, Header, Content } = Layout

function ProviderLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isRam, ramInfo, hasRamPermission, logout } = useUserStore()
  const isMobile = useIsMobile()
  const [drawerVisible, setDrawerVisible] = useState(false)

  // RAM 子账户的权限检查
  const canViewOrders = !isRam || hasRamPermission('order')
  const canViewMerchants = !isRam || hasRamPermission('merchant')
  const canViewChannels = !isRam || hasRamPermission('channel')
  const canViewSettings = !isRam || hasRamPermission('settings')

  const menuItems = [
    {
      key: '/admin/overview',
      icon: <BarChartOutlined />,
      label: '平台概览'
    },
    ...(canViewOrders ? [{
      key: '/admin/orders',
      icon: <UnorderedListOutlined />,
      label: '交易流水'
    }] : []),
    ...(canViewMerchants ? [{
      key: '/admin/merchants',
      icon: <TeamOutlined />,
      label: '商户管理'
    }] : []),
    // 通道配置需要 channel 权限
    ...(canViewChannels ? [{
      key: '/admin/channels',
      icon: <ApiOutlined />,
      label: '通道配置'
    }] : []),
    // 支付组管理需要 channel 权限
    ...(canViewChannels ? [{
      key: '/admin/paygroups',
      icon: <AppstoreOutlined />,
      label: '支付组管理'
    }] : []),
    // 结算管理需要 settings 权限
    ...(canViewSettings ? [{
      key: '/admin/settlements',
      icon: <WalletOutlined />,
      label: '结算管理'
    }] : []),
    // 域名白名单审核需要 merchant 权限
    ...(canViewMerchants ? [{
      key: '/admin/domains',
      icon: <GlobalOutlined />,
      label: '域名白名单'
    }] : []),
    ...(canViewSettings ? [{
      key: '/admin/announcements',
      icon: <NotificationOutlined />,
      label: '公告管理'
    }] : []),
    ...(canViewSettings ? [{
      key: '/admin/cleanup',
      icon: <DeleteOutlined />,
      label: '清理记录'
    }] : []),
    // 个人资料：所有用户都可以访问（RAM用户可以修改密码）
    {
      key: '/admin/profile',
      icon: <UserOutlined />,
      label: isRam ? '个人资料' : '平台资料'
    },
    // RAM 子账户不显示 RAM 管理菜单
    ...(!isRam ? [{
      key: '/admin/ram',
      icon: <ShareAltOutlined />,
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
        <span>管理后台</span>
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

export default ProviderLayout

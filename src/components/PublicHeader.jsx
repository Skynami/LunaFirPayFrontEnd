import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, Space, Drawer } from 'antd'
import { MenuOutlined } from '@ant-design/icons'
import { useUserStore } from '../stores/userStore'
import api from '../utils/api'
import styles from './PublicHeader.module.css'

function PublicHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn, userType } = useUserStore()
  const [testPayEnabled, setTestPayEnabled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    let mounted = true

    const fetchTestPayConfig = async () => {
      try {
        const res = await api.get('/api/pay/test/config')
        if (!mounted) return
        setTestPayEnabled(res.data.code === 0 && res.data.data?.enabled === true)
      } catch (error) {
        if (mounted) {
          setTestPayEnabled(false)
        }
      }
    }

    fetchTestPayConfig()
    return () => {
      mounted = false
    }
  }, [])

  const isActive = (path) => {
    return location.pathname === path
  }

  const handleConsoleClick = () => {
    if (userType === 'admin') {
      navigate('/admin')
    } else if (userType === 'provider') {
      navigate('/provider')
    } else {
      navigate('/merchant')
    }
  }

  const btnStyle = { height: '36px', padding: '4px 16px', fontSize: '14px', borderRadius: '0' }
  const isTestPayPage = location.pathname === '/test-pay' || location.pathname.startsWith('/test-pay/')
  const isDocPage = location.pathname === '/doc' || location.pathname.startsWith('/doc/')
  // 在测试支付页始终显示对应标签，避免异步配置加载导致导航抖动
  const showTestPayTab = isTestPayPage || (testPayEnabled && (location.pathname === '/' || isDocPage))

  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        <div className={styles.logo} onClick={() => navigate('/')}>
          <img src="/logo.png" alt="Logo" className={styles.logoImg} />
        </div>
        <nav className={styles.nav}>
          <a 
            className={`${styles.navLink} ${isActive('/') ? styles.active : ''}`}
            onClick={() => navigate('/')}
          >
            首页
          </a>
          <a 
            className={`${styles.navLink} ${isActive('/doc') ? styles.active : ''}`}
            onClick={() => navigate('/doc')}
          >
            API文档
          </a>
          {showTestPayTab && (
            <a
              className={`${styles.navLink} ${isActive('/test-pay') ? styles.active : ''}`}
              onClick={() => navigate('/test-pay')}
            >
              测试支付
            </a>
          )}
        </nav>
        <div className={styles.headerButtons}>
          <Button
            type="text"
            className={styles.mobileNavToggle}
            icon={<MenuOutlined />}
            onClick={() => setMobileMenuOpen(true)}
            aria-label="打开导航菜单"
          />
          {isLoggedIn ? (
            <Button type="primary" style={btnStyle} onClick={handleConsoleClick}>控制台</Button>
          ) : (
            <Space size="small">
              <Button ghost style={btnStyle} onClick={() => navigate('/login')}>登录</Button>
              <Button type="primary" style={{ ...btnStyle, background: '#fff', color: '#2563eb', border: 'none' }} onClick={() => navigate('/register')}>注册</Button>
            </Space>
          )}
        </div>
      </div>

      <Drawer
        placement="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="导航菜单"
        width={260}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Button block onClick={() => { navigate('/'); setMobileMenuOpen(false) }}>
            首页
          </Button>
          <Button block onClick={() => { navigate('/doc'); setMobileMenuOpen(false) }}>
            API文档
          </Button>
          {showTestPayTab && (
            <Button block onClick={() => { navigate('/test-pay'); setMobileMenuOpen(false) }}>
              测试支付
            </Button>
          )}
        </Space>
      </Drawer>
    </header>
  )
}

export default PublicHeader

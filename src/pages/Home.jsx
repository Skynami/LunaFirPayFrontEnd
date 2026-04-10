import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Row, Col, Card, Typography, Space, Divider } from 'antd'
import { 
  ApiOutlined, 
  LoginOutlined, 
  SafetyOutlined, 
  ThunderboltOutlined, 
  CustomerServiceOutlined,
  GlobalOutlined 
} from '@ant-design/icons'
import { useUserStore } from '../stores/userStore'
import { getSiteConfig, loadSiteConfig } from '../utils/siteConfig'
import styles from './Home.module.css'

const { Title, Paragraph, Text } = Typography

function Home() {
  const navigate = useNavigate()
  const { isLoggedIn } = useUserStore()
  const [siteName, setSiteName] = useState(getSiteConfig().siteName)

  useEffect(() => {
    let mounted = true
    loadSiteConfig().then((config) => {
      if (mounted && config?.siteName) {
        setSiteName(config.siteName)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  const features = [
    {
      icon: <SafetyOutlined style={{ fontSize: '36px', color: '#2563eb' }} />,
      title: '安全可靠',
      desc: '银行级数据加密，多重安全防御机制，保障每笔交易安全稳定。'
    },
    {
      icon: <ThunderboltOutlined style={{ fontSize: '36px', color: '#2563eb' }} />,
      title: '极速接入',
      desc: '完善的API文档与SDK支持，5分钟即可完成接口调试与系统对接。'
    },
    {
      icon: <GlobalOutlined style={{ fontSize: '36px', color: '#2563eb' }} />,
      title: '全渠道覆盖',
      desc: '支持微信、支付宝、云闪付等主流支付方式，满足各类业务场景。'
    },
    {
      icon: <CustomerServiceOutlined style={{ fontSize: '36px', color: '#2563eb' }} />,
      title: '专属服务',
      desc: '7x24小时专业技术团队在线支持，即时响应解决您的对接问题。'
    }
  ]

  return (
    <div className={styles.homePage}>
      {/* Hero Section */}
      <section id="home" className={styles.heroSection} style={{ padding: '160px 0 120px', textAlign: 'center' }}>
        <div className={styles.heroContainer} style={{ justifyContent: 'center' }}>
          <div className={styles.heroContent} style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Title level={1} style={{ fontSize: '56px', color: '#fff', marginBottom: '24px' }}>
              {siteName}
            </Title>
            <Paragraph style={{ fontSize: '20px', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '40px' }}>
              为您提供专业、安全、高效的聚合支付解决方案。一站式接入全渠道支付，助您轻松实现业务变现。
            </Paragraph>
            <Space size="large" className={styles.heroButtons} style={{ justifyContent: 'center' }}>
              <Button type="primary" size="large" style={{ height: '50px', padding: '0 32px', fontSize: '18px' }} onClick={() => navigate('/doc')}>
                <ApiOutlined /> 开发文档
              </Button>
              <Button size="large" style={{ height: '50px', padding: '0 32px', fontSize: '18px', background: '#fff', color: '#2563eb', border: 'none' }} onClick={() => navigate(isLoggedIn ? '/merchant' : '/login')}>
                <LoginOutlined /> {isLoggedIn ? '进入控制台' : '立即登录'}
              </Button>
            </Space>
          </div>
        </div>
      </section>

      {/* 核心优势 Section */}
      <section style={{ padding: '80px 0', background: '#fff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <Title level={2} style={{ color: '#1f2937', marginBottom: '16px' }}>为什么选择我们？</Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>全面的支付产品，卓越的服务体验</Text>
          </div>
          <Row gutter={[32, 32]}>
            {features.map((feature, index) => (
              <Col xs={24} sm={12} md={6} key={index}>
                <Card 
                  hoverable 
                  style={{ height: '100%', textAlign: 'center', borderRadius: '0', border: '1px solid #f0f0f0' }}
                  bodyStyle={{ padding: '32px 24px' }}
                >
                  <div style={{ marginBottom: '20px' }}>{feature.icon}</div>
                  <Title level={4} style={{ marginBottom: '16px', color: '#1f2937' }}>{feature.title}</Title>
                  <Paragraph type="secondary" style={{ marginBottom: 0, lineHeight: '1.6' }}>
                    {feature.desc}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* 接入流程 Section */}
      <section style={{ padding: '80px 0', background: '#f8fafc' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <Title level={2} style={{ color: '#1f2937', marginBottom: '16px' }}>简单的接入流程</Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>化繁为简，最快只需一杯咖啡的时间便可完成对接</Text>
          </div>
          <Row gutter={[24, 24]} justify="center">
            {['注册账号', '资质认证', '获取API密钥', '联调测试', '正式上线'].map((step, idx) => (
              <Col xs={24} sm={12} md={4} key={idx} style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '64px', height: '64px', borderRadius: '50%', background: '#e0e7ff', 
                  color: '#2563eb', fontSize: '24px', fontWeight: 'bold', lineHeight: '64px', 
                  margin: '0 auto 16px', border: '4px solid #fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' 
                }}>
                  {idx + 1}
                </div>
                <Title level={5} style={{ margin: 0 }}>{step}</Title>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* 底部 Footer */}
      <footer style={{ background: '#1e293b', padding: '40px 0', color: 'rgba(255, 255, 255, 0.6)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px', textAlign: 'center' }}>
          <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </Text>
        </div>
      </footer>
    </div>
  )
}

export default Home

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Row, Col, Button, Space, Card, Statistic, Alert } from 'antd'
import { UnorderedListOutlined, SettingOutlined, WalletOutlined } from '@ant-design/icons'
import api from '../../utils/api'

function Overview() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    today: {},
    total: {},
    pay_group_name: null,
    rates: []
  })
  const [balance, setBalance] = useState(0)
  const [announcements, setAnnouncements] = useState([])

  const formatMoney = (value) => {
    return parseFloat(value || 0).toFixed(2)
  }

  const successRate = () => {
    const total = stats.total?.order_count || 0
    const success = stats.total?.success_count || 0
    if (total === 0) return '0.00'
    return (success / total * 100).toFixed(2)
  }

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/merchant/overview')
      if (res.data.code === 0) {
        setStats(res.data.data)
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
  }

  const fetchBalance = async () => {
    try {
      const res = await api.get('/api/merchant/balance/total')
      if (res.data.code === 0) {
        setBalance(res.data.data.balance)
      }
    } catch (error) {
      console.error('获取余额失败:', error)
    }
  }

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/api/merchant/announcements', {
        params: { limit: 5 }
      })
      if (res.data.code === 0) {
        setAnnouncements(res.data.data || [])
      }
    } catch (error) {
      console.error('获取公告失败:', error)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchBalance()
    fetchAnnouncements()

    const timer = setInterval(() => {
      fetchStats()
      fetchBalance()
      fetchAnnouncements()
    }, 60000)

    return () => {
      clearInterval(timer)
    }
  }, [])

  return (
    <div>
      <h2 className="page-title">平台概览</h2>

      {/* 余额和费率卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card 
            styles={{ body: { padding: '20px 24px', height: 100, display: 'flex', alignItems: 'center' } }}
          >
            <Row align="middle" justify="space-between" style={{ width: '100%' }}>
              <Col>
                <Statistic 
                  title="账户总余额"
                  value={formatMoney(balance)}
                  prefix="¥"
                  valueStyle={{ fontSize: 32, fontWeight: 600 }}
                />
              </Col>
              <Col>
                <WalletOutlined style={{ fontSize: 48, color: 'rgba(0,0,0,0.25)' }} />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card 
            styles={{ body: { padding: '20px 24px', height: 100, display: 'flex', alignItems: 'center' } }}
          >
            <div style={{ width: '100%' }}>
              <div style={{ color: 'rgba(0,0,0,0.45)', marginBottom: 8 }}>
                通道费率
              </div>
              {stats.rates && stats.rates.length > 0 ? (
                <Row gutter={[24, 0]}>
                  {stats.rates.map(r => (
                    <Col key={r.pay_type}>
                      <span style={{ color: '#666', marginRight: 4 }}>{r.pay_type_name}:</span>
                      <span style={{ color: '#1890ff', fontWeight: 600, fontSize: 18 }}>{(r.rate * 100).toFixed(2)}%</span>
                    </Col>
                  ))}
                </Row>
              ) : (
                <div style={{ color: '#999', fontSize: 18 }}>暂未分配通道</div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
      
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Statistic 
              title="今日交易额" 
              value={formatMoney(stats.today?.total_money)} 
              prefix="¥" 
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Statistic 
              title="今日订单数" 
              value={stats.today?.order_count || 0}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Statistic 
              title="今日成功订单" 
              value={stats.today?.success_count || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Statistic 
              title="今日成功率" 
              value={(() => {
                const total = stats.today?.order_count || 0
                const success = stats.today?.success_count || 0
                return total > 0 ? ((success / total) * 100).toFixed(1) : '0.0'
              })()}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Statistic 
              title="累计交易额" 
              value={formatMoney(stats.total?.total_money)} 
              prefix="¥" 
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Statistic 
              title="累计订单数" 
              value={stats.total?.order_count || 0}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Statistic 
              title="累计成功订单" 
              value={stats.total?.success_count || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Statistic 
              title="成功率" 
              value={successRate()}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      {/* 快捷操作 */}
      <Card size="small" title="快捷操作" style={{ marginTop: 24 }}>
        <Space wrap>
          <Button type="primary" icon={<SettingOutlined />} onClick={() => navigate('/merchant/services')}>
            接口配置
          </Button>
          <Button icon={<UnorderedListOutlined />} onClick={() => navigate('/merchant/orders')}>
            查看流水
          </Button>
          <Button icon={<SettingOutlined />} onClick={() => navigate('/merchant/services')}>
            账户设置
          </Button>
        </Space>
      </Card>

      {announcements.length > 0 && (
        <Card size="small" title="系统公告" style={{ marginTop: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {announcements.map((item) => (
              <Alert
                key={item.id}
                type="info"
                showIcon
                message={<b>{item.title}</b>}
                description={<div style={{ whiteSpace: 'pre-wrap' }}>{item.content}</div>}
              />
            ))}
          </Space>
        </Card>
      )}
    </div>
  )
}

export default Overview

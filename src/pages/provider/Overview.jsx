import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Button, Space, Table } from 'antd'
import { SettingOutlined, TeamOutlined, UnorderedListOutlined } from '@ant-design/icons'
import api from '../../utils/api'

function Overview() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    today: {},
    total: {},
    merchantCount: 0,
    costMoney: 0,
    topChannels: []
  })

  const formatMoney = (value) => {
    return parseFloat(value || 0).toFixed(2)
  }

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/admin/overview')
      if (res.data.code === 0) {
        setStats(res.data.data)
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
  }

  useEffect(() => {
    fetchStats()
    const timer = setInterval(fetchStats, 60000)

    return () => {
      clearInterval(timer)
    }
  }, [])

  // 通道流水TOP5表格
  const topChannelColumns = [
    { title: '排名', width: 60, render: (_, __, index) => index + 1 },
    { title: '通道名称', dataIndex: 'channel_name' },
    { title: '交易金额', dataIndex: 'total_money', render: (v) => `¥${formatMoney(v)}` },
    { title: '订单数', dataIndex: 'order_count', width: 80 },
    { title: '成功率', dataIndex: 'success_rate', width: 80, render: (v) => `${((v || 0) * 100).toFixed(1)}%` }
  ]

  return (
    <div>
      <h2 className="page-title">平台概览</h2>
      
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} md={6}>
          <div className="stat-card">
            <div className="title">今日交易额</div>
            <div className="value primary">¥{formatMoney(stats.today?.total_money)}</div>
          </div>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <div className="stat-card">
            <div className="title">今日手续费收入</div>
            <div className="value success">¥{formatMoney(stats.today?.fee_money)}</div>
          </div>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <div className="stat-card">
            <div className="title">今日成功订单</div>
            <div className="value">{stats.today?.success_count || 0}</div>
          </div>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <div className="stat-card">
            <div className="title">商户数量</div>
            <div className="value">{stats.merchantCount || 0}</div>
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={12} md={6}>
          <div className="stat-card">
            <div className="title">累计交易额</div>
            <div className="value primary">¥{formatMoney(stats.total?.total_money)}</div>
          </div>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <div className="stat-card">
            <div className="title">累计手续费收入</div>
            <div className="value success">¥{formatMoney(stats.total?.fee_money)}</div>
          </div>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <div className="stat-card">
            <div className="title">累计通道成本</div>
            <div className="value" style={{ color: '#ff4d4f' }}>¥{formatMoney(stats.total?.cost_money)}</div>
          </div>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <div className="stat-card">
            <div className="title">累计成功订单</div>
            <div className="value">{stats.total?.success_count || 0}</div>
          </div>
        </Col>
      </Row>

      {/* 通道流水TOP5 */}
      <Card title="通道流水 TOP5" style={{ marginBottom: 16 }}>
        <Table
          columns={topChannelColumns}
          dataSource={stats.topChannels || []}
          rowKey="channel_id"
          size="small"
          pagination={false}
          bordered
          locale={{ emptyText: '暂无数据' }}
        />
      </Card>

      {/* 快捷操作 */}
      <Card title="快捷操作">
        <Space wrap>
          <Button type="primary" icon={<SettingOutlined />} onClick={() => navigate('/admin/channels')}>
            配置支付通道
          </Button>
          <Button icon={<TeamOutlined />} onClick={() => navigate('/admin/merchants')}>
            管理商户
          </Button>
          <Button icon={<UnorderedListOutlined />} onClick={() => navigate('/admin/orders')}>
            查看流水
          </Button>
        </Space>
      </Card>
    </div>
  )
}

export default Overview

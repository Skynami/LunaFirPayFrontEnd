import { useState, useEffect } from 'react'
import { Table, Form, Select, DatePicker, Input, Button, Tag, Modal, Descriptions, message, Space, Popconfirm, Dropdown } from 'antd'
import { SearchOutlined, DownOutlined, EyeOutlined, CheckCircleOutlined, RollbackOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import api from '../../utils/api'
import { formatTime } from '../../utils/time'

const { RangePicker } = DatePicker

// 加密货币图标映射
const cryptoIconMap = {
  'USDT.POLYGON': 'pol-usdt',
  'USDT.TRC20': 'tron-usdt',
  'USDC.BEP20': 'bsc-usdc',
  'TRX.NATIVE': 'tron-trx',
  'USDC.ARBITRUM': 'arbitrum-usdc',
  'USDT.ARBITRUM': 'arbitrum-usdt',
  'USDC.ERC20': 'ethereum-usdc',
  'USDT.ERC20': 'ethereum-usdt',
  'USDC.POLYGON': 'pol-usdc',
  'USDC.TRC20': 'tron-usdc',
}

// 获取支付方式图标
const getPayTypeIcon = (type) => {
  if (!type) return null
  const upperType = type.toUpperCase()
  if (cryptoIconMap[upperType]) {
    return `/assets/crypto/${cryptoIconMap[upperType]}.jpg`
  }
  return `/assets/icon/${type}.ico`
}

function Orders() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [totalMoney, setTotalMoney] = useState(0)
  const [totalFee, setTotalFee] = useState(0)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })
  const [searchForm, setSearchForm] = useState({
    merchantId: '',
    tradeNo: '',
    directLinkId: '',
    type: '',
    status: '',
    dateRange: null
  })
  const [showDetail, setShowDetail] = useState(false)
  const [currentOrder, setCurrentOrder] = useState(null)

  const formatMoney = (value) => parseFloat(value || 0).toFixed(2)

  const getTypeStyle = (type) => {
    const styles = { alipay: 'blue', wxpay: 'green', qqpay: 'orange' }
    return styles[type] || 'default'
  }

  const isDirectOrder = (row) => row?.direct_mode && row.direct_mode !== 'none'
  const isCallbackRequired = (row) => {
    if (!row) return false
    if (typeof row.callback_required !== 'undefined') {
      return Number(row.callback_required) === 1
    }
    return !isDirectOrder(row) && !!row.notify_url
  }

  const getEffectiveNotifyStatus = (row) => {
    if (!row) return 0
    if (typeof row.effective_notify_status !== 'undefined') {
      return Number(row.effective_notify_status)
    }
    if (!isCallbackRequired(row)) {
      return row.status === 1 ? 1 : 0
    }
    return Number(row.notify_status || 0)
  }

  // 获取订单状态信息
  const getOrderStatusInfo = (row) => {
    // 已退款优先
    if (row.refund_status === 1) {
      return { text: '已退款', color: 'red' }
    }

    // 退款失败
    if (row.refund_status === 2) {
      return { text: '退款失败', color: 'error' }
    }

    // 测试支付订单已取消（仅测试支付）
    if (row.order_type === 'test' && row.status === 2) {
      return { text: '已取消', color: 'default' }
    }
    
    // 已过期/已关闭
    if (row.status === 2) {
      return { text: '已过期', color: 'default' }
    }
    
    // 加密货币已支付未回调（status=3）
    if (row.status === 3 && row.order_type === 'crypto') {
      return { text: '已支付未回调', color: 'blue' }
    }
    
    // 已支付
    if (row.status === 1) {
      if (!isCallbackRequired(row) || getEffectiveNotifyStatus(row) === 1) {
        return { text: '已完成', color: 'success' }
      } else {
        return { text: '已支付待确认', color: 'blue' }
      }
    }
    
    // 未支付
    if (row.status === 0) {
      if (row.merchant_confirm === 1) {
        // 商户已认账
        return { text: '商户已认账', color: 'warning' }
      }
      return { text: '未支付', color: 'default' }
    }
    
    return { text: '未知', color: 'default' }
  }

  const fetchOrders = async (page = pagination.current, pageSize = pagination.pageSize, formOverride = null) => {
    setLoading(true)
    try {
      const activeForm = formOverride || searchForm
      const params = {
        page,
        pageSize,
        ...activeForm,
        startDate: activeForm.dateRange?.[0]?.format('YYYY-MM-DD') || '',
        endDate: activeForm.dateRange?.[1]?.format('YYYY-MM-DD') || ''
      }
      delete params.dateRange

      const res = await api.get('/api/admin/orders', { params })
      if (res.data.code === 0) {
        setOrders(res.data.data.list || [])
        setTotal(res.data.data.total || 0)
        setTotalMoney(res.data.data.totalMoney || 0)
        setTotalFee(res.data.data.totalFee || 0)
        setPagination({ ...pagination, current: page, pageSize })
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('获取订单列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchOrders(1)
  }

  const handleReset = () => {
    setSearchForm({
      merchantId: '',
      tradeNo: '',
      directLinkId: '',
      type: '',
      status: '',
      dateRange: null
    })
    fetchOrders(1)
  }

  const showOrderDetail = (order) => {
    setCurrentOrder(order)
    setShowDetail(true)
  }

  // 强制完成订单
  const forceCompleteOrder = async (order) => {
    try {
      const res = await api.post('/api/admin/orders/force-complete', {
        trade_no: order.trade_no
      })
      if (res.data.code === 0) {
        message.success('订单已强制完成')
        fetchOrders()
      } else {
        message.error(res.data.msg || '操作失败')
      }
    } catch (error) {
      message.error('操作失败')
    }
  }

  // 退款订单（显示确认框）
  const [refundModalVisible, setRefundModalVisible] = useState(false)
  const [refundOrder, setRefundOrder] = useState(null)

  const showRefundModal = (order) => {
    setRefundOrder(order)
    setRefundModalVisible(true)
  }

  const handleRefund = async () => {
    if (!refundOrder) return
    try {
      const res = await api.post('/api/admin/orders/refund', {
        trade_no: refundOrder.trade_no
      })
      if (res.data.code === 0) {
        message.success('退款成功')
        setRefundModalVisible(false)
        setRefundOrder(null)
        fetchOrders()
      } else {
        message.error(res.data.msg || '退款失败')
      }
    } catch (error) {
      message.error('退款失败')
    }
  }

  // 确认支付
  const confirmPayment = async (order) => {
    try {
      const res = await api.post('/api/admin/orders/confirm-payment', {
        trade_no: order.trade_no
      })
      if (res.data.code === 0) {
        message.success(res.data.msg || '确认支付成功')
        fetchOrders()
      } else {
        message.error(res.data.msg || '确认支付失败')
      }
    } catch (error) {
      message.error('确认支付失败')
    }
  }

  // 获取操作下拉菜单
  const getActionMenuItems = (row) => {
    const items = [
      {
        key: 'detail',
        icon: <EyeOutlined />,
        label: '订单详情',
        onClick: () => showOrderDetail(row)
      }
    ]

    // 未支付订单可以强制完成
    if (row.status === 0 && !row.merchant_confirm) {
      items.push({
        key: 'force-complete',
        icon: <CheckCircleOutlined />,
        label: '强制完成',
        onClick: () => {
          Modal.confirm({
            title: '强制完成订单',
            content: '确认强制完成此订单并标记为已支付？',
            onOk: () => forceCompleteOrder(row)
          })
        }
      })
    }

    // 商户已认账的订单，显示"确认支付"
    if (row.status === 0 && row.merchant_confirm === 1) {
      items.push({
        key: 'confirm-pay',
        icon: <CheckCircleOutlined />,
        label: '确认支付',
        onClick: () => {
          Modal.confirm({
            title: '确认支付',
            content: '此订单商户已认账，确认后将标记为已支付，确定继续吗？',
            onOk: () => forceCompleteOrder(row)
          })
        }
      })
    }

    // 已支付订单可做支付确认（待确认或商户认账）
    if (row.status === 1 && !row.refund_status
      && (Number(row.confirm_payment_required || 0) === 1
        || row.merchant_confirm === 1
        || (isCallbackRequired(row) && getEffectiveNotifyStatus(row) !== 1))) {
      items.push({
        key: 'confirm-payment',
        icon: <CheckCircleOutlined />,
        label: '确认支付',
        onClick: () => {
          Modal.confirm({
            title: '确认支付',
            content: '确认该订单支付状态并完成入账处理吗？',
            onOk: () => confirmPayment(row)
          })
        }
      })
    }

    // 已支付订单可以退款（未退款的）
    if (row.status === 1 && !row.refund_status) {
      items.push({
        key: 'refund',
        icon: <RollbackOutlined />,
        label: '发起退款',
        danger: true,
        onClick: () => showRefundModal(row)
      })
    }

    return items
  }

  useEffect(() => {
    const tradeNoFromQuery = (searchParams.get('tradeNo') || '').trim()
    const directLinkIdFromQuery = (searchParams.get('directLinkId') || '').trim()
    const merchantIdFromQuery = (searchParams.get('merchantId') || '').trim()
    if (tradeNoFromQuery || directLinkIdFromQuery || merchantIdFromQuery) {
      const nextForm = {
        merchantId: merchantIdFromQuery,
        tradeNo: tradeNoFromQuery,
        directLinkId: directLinkIdFromQuery,
        type: '',
        status: '',
        dateRange: null
      }
      setSearchForm(nextForm)
      fetchOrders(1, pagination.pageSize, nextForm)
      return
    }
    fetchOrders()
  }, [])

  const columns = [
    {
      title: '订单号',
      width: 220,
      render: (_, row) => (
        <div style={{ fontSize: 12, fontFamily: 'monospace' }}>
          <div style={{ color: '#666' }}>{row.out_trade_no}</div>
          <div style={{ color: '#999', fontSize: 11 }}>{row.trade_no}</div>
        </div>
      )
    },
    {
      title: '商户号',
      dataIndex: 'merchant_display',
      width: 110
    },
    { title: '商品名称', dataIndex: 'name', width: 120, ellipsis: true },
    {
      title: '支付类型',
      dataIndex: 'pay_type',
      width: 100,
      render: (type) => {
        if (!type) return '-'
        const typeLabels = { alipay: '支付宝', wxpay: '微信支付', qqpay: 'QQ钱包', bank: '网银支付', jdpay: '京东支付', paypal: 'PayPal', ecny: '数字人民币' }
        return (
          <Space size={4}>
            <img src={getPayTypeIcon(type)} alt="" style={{ width: 16, height: 16, borderRadius: 2 }} onError={(e) => e.target.style.display = 'none'} />
            <Tag color={getTypeStyle(type)}>{typeLabels[type] || type}</Tag>
          </Space>
        )
      }
    },
    {
      title: '支付通道',
      width: 140,
      render: (_, row) => row.channel_name ? (
        <div style={{ fontSize: 12 }}>
          <div>{row.channel_name}</div>
          {row.channel_plugin && <div style={{ color: '#999' }}>{row.channel_plugin}</div>}
        </div>
      ) : '-'
    },
    {
      title: '订单金额',
      dataIndex: 'money',
      width: 100,
      align: 'right',
      render: (v) => <span style={{ fontWeight: 600 }}>¥{formatMoney(v)}</span>
    },
    {
      title: '手续费',
      dataIndex: 'fee',
      width: 80,
      align: 'right',
      render: (v) => <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>¥{formatMoney(v)}</span>
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      align: 'center',
      render: (status, row) => {
        const statusInfo = getOrderStatusInfo(row)
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
      }
    },
    {
      title: '理由',
      dataIndex: 'refund_reason',
      width: 180,
      ellipsis: true,
      render: (_, row) => {
        if (row.refund_status === 2) {
          return row.refund_reason || '退款失败'
        }
        if (row.order_type === 'test' && row.status === 2 && row.refund_status !== 1) {
          return row.refund_reason || '测试支付用户取消'
        }
        return '-'
      }
    },
    { 
      title: '时间', 
      width: 170,
      render: (_, row) => (
        <div style={{ fontSize: 12 }}>
          <div>创建: {formatTime(row.created_at)}</div>
          {row.paid_at && <div>支付: {formatTime(row.paid_at)}</div>}
        </div>
      )
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right',
      render: (_, row) => (
        <Dropdown
          menu={{ items: getActionMenuItems(row) }}
          trigger={['click']}
        >
          <Button type="link" size="small">
            操作 <DownOutlined />
          </Button>
        </Dropdown>
      )
    }
  ]

  return (
    <div>
      <h2 className="page-title">交易流水</h2>

      {/* 搜索区域 */}
      <div className="filter-bar" style={{ padding: 20, marginBottom: 16 }}>
        <Form layout="inline">
          <Form.Item label="商户号">
            <Input
              value={searchForm.merchantId}
              onChange={(e) => setSearchForm({ ...searchForm, merchantId: e.target.value })}
              placeholder="输入商户号"
              allowClear
              style={{ width: 160 }}
            />
          </Form.Item>
          <Form.Item label="订单号">
            <Input
              value={searchForm.tradeNo}
              onChange={(e) => setSearchForm({ ...searchForm, tradeNo: e.target.value })}
              placeholder="平台/商户订单号"
              allowClear
              style={{ width: 180 }}
            />
          </Form.Item>
          <Form.Item label="支付类型">
            <Select
              value={searchForm.type}
              onChange={(v) => setSearchForm({ ...searchForm, type: v })}
              placeholder="全部"
              allowClear
              style={{ width: 120 }}
            >
              <Select.Option value="alipay">支付宝</Select.Option>
              <Select.Option value="wxpay">微信支付</Select.Option>
              <Select.Option value="qqpay">QQ钱包</Select.Option>
              <Select.Option value="bank">网银支付</Select.Option>
              <Select.Option value="jdpay">京东支付</Select.Option>
              <Select.Option value="paypal">PayPal</Select.Option>
              <Select.Option value="ecny">数字人民币</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="状态">
            <Select
              value={searchForm.status}
              onChange={(v) => setSearchForm({ ...searchForm, status: v })}
              placeholder="全部"
              allowClear
              style={{ width: 100 }}
            >
              <Select.Option value={0}>待支付</Select.Option>
              <Select.Option value={1}>已支付</Select.Option>
              <Select.Option value={2}>已关闭</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="时间范围">
            <RangePicker
              value={searchForm.dateRange}
              onChange={(dates) => setSearchForm({ ...searchForm, dateRange: dates })}
              style={{ width: 260 }}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
            <Button onClick={handleReset} style={{ marginLeft: 8 }}>重置</Button>
          </Form.Item>
        </Form>
      </div>

      {/* 统计信息 */}
      <div className="stats-summary">
        <span>查询结果：{total} 条记录</span>
        <span>成功交易额：<b className="primary">¥{formatMoney(totalMoney)}</b></span>
        <span>手续费收入：<b className="success">¥{formatMoney(totalFee)}</b></span>
      </div>

      {/* 订单列表 */}
      <Table
        columns={columns}
        dataSource={orders}
        loading={loading}
        rowKey="trade_no"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          pageSizeOptions: [20, 50, 100],
          onChange: (page, pageSize) => fetchOrders(page, pageSize)
        }}
        scroll={{ x: 'max-content' }}
        style={{ width: '100%' }}
        bordered
      />

      {/* 订单详情弹窗 */}
      <Modal
        title="订单详情"
        open={showDetail}
        onCancel={() => setShowDetail(false)}
        footer={null}
        width={780}
      >
        {currentOrder && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="平台订单号">{currentOrder.trade_no}</Descriptions.Item>
            <Descriptions.Item label="商户订单号">{currentOrder.out_trade_no}</Descriptions.Item>
            <Descriptions.Item label="订单标题">{currentOrder.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="时间">
              <div>创建: {formatTime(currentOrder.created_at)}</div>
              {currentOrder.paid_at && <div>支付: {formatTime(currentOrder.paid_at)}</div>}
            </Descriptions.Item>
            <Descriptions.Item label="商户号">{currentOrder.merchant_display || '-'}</Descriptions.Item>
            <Descriptions.Item label="商户名称">{currentOrder.merchant_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="订单金额">¥{formatMoney(currentOrder.money)}</Descriptions.Item>
            <Descriptions.Item label="手续费">¥{formatMoney(currentOrder.fee)}</Descriptions.Item>
            <Descriptions.Item label="支付类型">{currentOrder.pay_type || '-'}</Descriptions.Item>
            <Descriptions.Item label="支付通道">
              {currentOrder.channel_name ? (
                <span>{currentOrder.channel_name} <span style={{ color: '#999' }}>({currentOrder.channel_plugin})</span></span>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="订单状态">
              <Tag color={getOrderStatusInfo(currentOrder).color}>{getOrderStatusInfo(currentOrder).text}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="访客IP">{currentOrder.ip || '-'}</Descriptions.Item>
            {currentOrder.status === 1 && (
              <Descriptions.Item label="支付确认状态" span={2}>
                {!isCallbackRequired(currentOrder) ? (
                  <Tag color="default">无需回调</Tag>
                ) : getEffectiveNotifyStatus(currentOrder) === 1 ? (
                  <Tag color="success">已成功</Tag>
                ) : (
                  <Tag color="warning">未成功</Tag>
                )}
                {isCallbackRequired(currentOrder) && currentOrder.notify_count > 0 && (
                  <span style={{ marginLeft: 8, color: '#666' }}>
                    已回调 {currentOrder.notify_count} 次
                    {currentOrder.notify_time && <span style={{ marginLeft: 8 }}>({formatTime(currentOrder.notify_time)})</span>}
                  </span>
                )}
              </Descriptions.Item>
            )}
            {currentOrder.refund_status === 1 && (
              <>
                <Descriptions.Item label="退款单号">{currentOrder.refund_no || '-'}</Descriptions.Item>
                <Descriptions.Item label="退款时间">{formatTime(currentOrder.refund_at)}</Descriptions.Item>
                <Descriptions.Item label="退款金额" span={2}>
                  <span style={{ color: '#ff4d4f' }}>¥{formatMoney(currentOrder.refund_money)}</span>
                </Descriptions.Item>
              </>
            )}
            {currentOrder.refund_status === 2 && (
              <Descriptions.Item label="退款失败原因" span={2}>
                <span style={{ color: '#ff4d4f' }}>{currentOrder.refund_reason || '未知原因'}</span>
              </Descriptions.Item>
            )}
            {currentOrder.order_type === 'test' && currentOrder.status === 2 && currentOrder.refund_status !== 1 && (
              <Descriptions.Item label="取消原因" span={2}>
                {currentOrder.refund_reason || '测试支付用户取消'}
              </Descriptions.Item>
            )}
            <Descriptions.Item label={currentOrder.direct_mode === 'fixed' ? '发起Token' : '回调地址'} span={2}>
              <span style={{ wordBreak: 'break-all', fontSize: 12 }}>
                {currentOrder.direct_mode === 'fixed' ? (currentOrder.direct_token || '-') : (currentOrder.notify_url || '-')}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="跳转地址" span={2}>
              <span style={{ wordBreak: 'break-all', fontSize: 12 }}>{currentOrder.return_url || '-'}</span>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 退款确认弹窗 */}
      <Modal
        title="发起退款"
        open={refundModalVisible}
        onCancel={() => {
          setRefundModalVisible(false)
          setRefundOrder(null)
        }}
        onOk={handleRefund}
        okText="确认退款"
        okButtonProps={{ danger: true }}
        cancelText="取消"
      >
        {refundOrder && (
          <div>
            <p>确认对以下订单发起退款？</p>
            <Descriptions column={1} size="small" bordered style={{ marginTop: 16 }}>
              <Descriptions.Item label="订单号">{refundOrder.trade_no}</Descriptions.Item>
              <Descriptions.Item label="商户订单号">{refundOrder.out_trade_no}</Descriptions.Item>
              <Descriptions.Item label="订单金额">¥{formatMoney(refundOrder.money)}</Descriptions.Item>
              <Descriptions.Item label="商品名称">{refundOrder.name || '-'}</Descriptions.Item>
            </Descriptions>
            <p style={{ marginTop: 16, color: '#ff4d4f' }}>
              注意：退款操作不可撤销，请确认后再操作！
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Orders

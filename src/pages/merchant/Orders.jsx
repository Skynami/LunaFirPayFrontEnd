import { useState, useEffect } from 'react'
import { Table, Form, Select, DatePicker, Input, Button, Tag, Modal, Descriptions, InputNumber, message, Space, Alert } from 'antd'
import api from '../../utils/api'
import { formatTime } from '../../utils/time'
import dayjs from 'dayjs'

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
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filter, setFilter] = useState({ status: null, dateRange: null, tradeNo: '' })
  const [detailVisible, setDetailVisible] = useState(false)
  const [refundVisible, setRefundVisible] = useState(false)
  const [currentOrder, setCurrentOrder] = useState(null)
  const [refundForm, setRefundForm] = useState({ money: 0, reason: '' })
  const [refundLoading, setRefundLoading] = useState(false)
  const [notifyLoading, setNotifyLoading] = useState(false)
  const [refundInfo, setRefundInfo] = useState(null)  // 退款查询信息
  const [refundQueryLoading, setRefundQueryLoading] = useState(false)

  // 获取订单状态显示
  // 状态逻辑：
  // - 已完成：支付成功且回调成功 (status=1, notify_status=1)
  // - 已支付未回调：已支付但回调失败 (status=1, notify_status!=1)
  // - 未支付已回调：未支付但商户认账 (status=0, merchant_confirm=1)
  // - 未支付：等待支付 (status=0)
  // - 已过期：订单关闭 (status=2)
  // - 已退款：已退款 (refund_status=1)
  const getOrderStatusDisplay = (row) => {
    // 已退款优先
    if (row.refund_status === 1) {
      return { text: '已退款', color: 'red' }
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
      if (row.notify_status === 1) {
        return { text: '已完成', color: 'success' }
      } else {
        return { text: '已支付未回调', color: 'blue' }
      }
    }
    
    // 未支付
    if (row.status === 0) {
      if (row.merchant_confirm === 1) {
        // 已认账：区分回调成功和失败
        if (row.notify_status === 1) {
          return { text: '已认账已回调', color: 'gold' }
        } else {
          return { text: '已认账未回调', color: 'warning' }
        }
      }
      return { text: '未支付', color: 'default' }
    }
    
    return { text: '未知', color: 'default' }
  }

  const fetchOrders = async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true)
    try {
      const params = {
        page,
        pageSize,
        status: filter.status,
        tradeNo: filter.tradeNo
      }
      
      if (filter.dateRange && filter.dateRange.length === 2) {
        params.startDate = filter.dateRange[0].format('YYYY-MM-DD')
        params.endDate = filter.dateRange[1].format('YYYY-MM-DD')
      }

      const res = await api.get('/api/merchant/orders', { params })
      if (res.data.code === 0) {
        setOrders(res.data.data.list)
        setPagination({ ...pagination, current: page, pageSize, total: res.data.data.total })
      }
    } catch (error) {
      console.error('获取订单失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetFilter = () => {
    setFilter({ status: null, dateRange: null, tradeNo: '' })
    fetchOrders(1)
  }

  const viewOrder = (row) => {
    setCurrentOrder(row)
    setDetailVisible(true)
  }

  // 查询退款信息并打开退款弹窗
  const refundOrder = async (row) => {
    setCurrentOrder(row)
    setRefundQueryLoading(true)
    setRefundVisible(true)
    setRefundInfo(null)
    setRefundForm({ money: 0, reason: '' })
    
    try {
      const res = await api.post('/api/merchant/refund/query', { tradeNo: row.trade_no })
      if (res.data.code === 0) {
        setRefundInfo(res.data.data)
        setRefundForm({ 
          money: parseFloat(res.data.data.maxRefund), 
          reason: ''
        })
      } else {
        message.error(res.data.msg)
        setRefundVisible(false)
      }
    } catch (error) {
      message.error('查询退款信息失败')
      setRefundVisible(false)
    } finally {
      setRefundQueryLoading(false)
    }
  }

  const submitRefund = async () => {
    if (!refundForm.money || refundForm.money <= 0) {
      message.error('请输入退款金额')
      return
    }

    setRefundLoading(true)
    try {
      const res = await api.post('/api/merchant/refund', {
        tradeNo: currentOrder.trade_no,
        money: refundForm.money,
        reason: refundForm.reason
      })
      
      if (res.data.code === 0) {
        message.success(res.data.msg || '退款成功')
        setRefundVisible(false)
        fetchOrders()
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('退款失败')
    } finally {
      setRefundLoading(false)
    }
  }

  // 加密货币订单强制回调（已支付订单）
  const forceNotify = (row) => {
    Modal.confirm({
      title: '强制回调',
      content: `确定要对订单 ${row.trade_no} 执行强制回调吗？`,
      onOk: async () => {
        setNotifyLoading(true)
        try {
          const res = await api.post('/api/merchant/crypto/notify', { tradeNo: row.trade_no })
          if (res.data.code === 0) {
            message.success('回调成功')
            fetchOrders()
          } else {
            message.error(res.data.msg)
          }
        } catch (error) {
          message.error('回调失败')
        } finally {
          setNotifyLoading(false)
        }
      }
    })
  }

  // 加密货币订单认账（未支付/已过期订单变成已支付）
  const cryptoConfirm = (row) => {
    Modal.confirm({
      title: '订单认账',
      content: (
        <div>
          <p>确定要对订单 <strong>{row.trade_no}</strong> 执行认账吗？</p>
          <p style={{ color: '#faad14', marginTop: 8 }}>
            认账后订单将变为已支付状态，并自动发送回调通知。
          </p>
        </div>
      ),
      okText: '确认认账',
      onOk: async () => {
        try {
          const res = await api.post('/api/merchant/crypto/confirm', { tradeNo: row.trade_no })
          if (res.data.code === 0) {
            message.success(res.data.msg || '认账成功')
            fetchOrders()
          } else {
            message.error(res.data.msg)
          }
        } catch (error) {
          message.error('认账失败')
        }
      }
    })
  }

  // 普通订单商户认账回调（未支付或已过期订单）
  const merchantConfirmNotify = (row) => {
    Modal.confirm({
      title: '商户认账',
      content: (
        <div>
          <p>确定要对订单 <strong>{row.trade_no}</strong> 执行商户认账吗？</p>
          <p style={{ color: '#ff4d4f', marginTop: 8 }}>
            注意：此操作将向您的系统发送支付成功回调，但此订单在平台仍为未支付状态。
            如需正常入账，请联系管理员确认。
          </p>
        </div>
      ),
      okText: '确认认账',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await api.post('/api/merchant/orders/notify', { tradeNo: row.trade_no })
          if (res.data.code === 0) {
            message.success(res.data.msg || '回调成功')
            fetchOrders()
          } else {
            message.error(res.data.msg)
          }
        } catch (error) {
          message.error('回调失败')
        }
      }
    })
  }

  // 已支付普通订单重发回调
  const resendNotify = (row) => {
    Modal.confirm({
      title: '重发回调',
      content: `确定要对订单 ${row.trade_no} 重新发送支付成功回调吗？`,
      onOk: async () => {
        try {
          const res = await api.post('/api/merchant/orders/resend-notify', { tradeNo: row.trade_no })
          if (res.data.code === 0) {
            message.success(res.data.msg || '回调成功')
            fetchOrders()
          } else {
            message.error(res.data.msg)
          }
        } catch (error) {
          message.error('回调失败')
        }
      }
    })
  }

  useEffect(() => {
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
      title: '类型', 
      width: 80,
      render: (_, row) => {
        if (row.order_type === 'crypto') {
          return <Tag color="green">加密货币</Tag>
        }
        return <Tag color="blue">普通支付</Tag>
      }
    },
    { title: '商品名称', dataIndex: 'name', width: 120, ellipsis: true },
    { 
      title: '金额', 
      width: 120,
      render: (_, row) => {
        const money = parseFloat(row.money || 0)
        const realMoney = parseFloat(row.real_money || row.money || 0)
        const feeMoney = parseFloat(row.fee_money || 0)
        
        // 如果有手续费，显示原始金额(灰色)和实收金额(黑色)
        if (feeMoney > 0 && row.fee_payer === 'merchant') {
          // 商户承担：实收 = 订单金额 - 手续费
          return (
            <div>
              <div style={{ fontWeight: 500 }}>¥{(money - feeMoney).toFixed(2)}</div>
              <div style={{ color: '#999', fontSize: 12, textDecoration: 'line-through' }}>¥{money.toFixed(2)}</div>
            </div>
          )
        } else if (feeMoney > 0 && row.fee_payer === 'buyer') {
          // 支付者承担：显示订单金额，实收=订单金额
          return (
            <div>
              <div style={{ fontWeight: 500 }}>¥{money.toFixed(2)}</div>
              <div style={{ color: '#52c41a', fontSize: 12 }}>买家付 ¥{realMoney.toFixed(2)}</div>
            </div>
          )
        }
        return <span style={{ fontWeight: 500 }}>¥{money.toFixed(2)}</span>
      }
    },
    { 
      title: '支付方式', 
      dataIndex: 'pay_type', 
      width: 110,
      render: (type) => {
        if (!type) return '-'
        // 加密货币保持原样显示
        const upperType = type.toUpperCase()
        if (cryptoIconMap[upperType]) {
          return (
            <Space size={4}>
              <img src={getPayTypeIcon(type)} alt="" style={{ width: 16, height: 16, borderRadius: 2 }} onError={(e) => e.target.style.display = 'none'} />
              <span>{type}</span>
            </Space>
          )
        }
        // 普通支付方式显示中文
        const typeLabels = { alipay: '支付宝', wxpay: '微信支付', qqpay: 'QQ钱包', bank: '网银支付', jdpay: '京东支付', paypal: 'PayPal', ecny: '数字人民币' }
        return (
          <Space size={4}>
            <img src={getPayTypeIcon(type)} alt="" style={{ width: 16, height: 16, borderRadius: 2 }} onError={(e) => e.target.style.display = 'none'} />
            <span>{typeLabels[type] || type}</span>
          </Space>
        )
      }
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      width: 110,
      render: (status, row) => {
        const { text, color } = getOrderStatusDisplay(row)
        return <Tag color={color}>{text}</Tag>
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
      width: 180,
      fixed: 'right',
      render: (_, row) => {
        const isRefunded = row.refund_status && row.refund_status !== 0
        return (
          <>
            {/* 详情 - 所有订单都显示 */}
            <Button type="link" size="small" onClick={() => viewOrder(row)}>详情</Button>
            {/* 已退款的订单只显示详情 */}
            {!isRefunded && (
              <>
                {/* 回调 - 已支付普通订单未回调成功 */}
                {row.status === 1 && row.notify_status !== 1 && row.order_type !== 'crypto' && (
                  <Button type="link" size="small" onClick={() => resendNotify(row)}>回调</Button>
                )}
                {/* 回调 - 已认账未回调普通订单 */}
                {row.status === 0 && row.merchant_confirm === 1 && row.notify_status !== 1 && row.order_type !== 'crypto' && (
                  <Button type="link" size="small" onClick={() => resendNotify(row)}>回调</Button>
                )}
                {/* 回调 - 已支付加密货币订单 */}
                {row.status === 1 && row.order_type === 'crypto' && (
                  <Button type="link" size="small" onClick={() => forceNotify(row)}>回调</Button>
                )}
                {/* 认账 - 未支付或已过期普通订单 */}
                {(row.status === 0 || row.status === 2) && row.order_type !== 'crypto' && row.merchant_confirm !== 1 && (
                  <Button type="link" size="small" style={{ color: '#faad14' }} onClick={() => merchantConfirmNotify(row)}>认账</Button>
                )}
                {/* 认账 - 未支付加密货币订单 */}
                {row.status === 0 && row.order_type === 'crypto' && (
                  <Button type="link" size="small" style={{ color: '#faad14' }} onClick={() => cryptoConfirm(row)}>认账</Button>
                )}
                {/* 退款 - 已支付普通订单或部分退款订单 */}
                {(row.status === 1 || (row.status === 2 && parseFloat(row.refund_money || 0) > 0 && parseFloat(row.refund_money || 0) < parseFloat(row.real_money || row.money))) && row.order_type !== 'crypto' && (
                  <Button type="link" size="small" danger onClick={() => refundOrder(row)}>退款</Button>
                )}
              </>
            )}
          </>
        )
      }
    }
  ]

  return (
    <div>
      <h2 className="page-title">交易流水</h2>

      {/* 筛选工具栏 */}
      <div className="filter-bar">
        <Form layout="inline">
          <Form.Item label="订单状态">
            <Select
              value={filter.status}
              onChange={(value) => setFilter({ ...filter, status: value })}
              placeholder="全部"
              allowClear
              style={{ width: 120 }}
            >
              <Select.Option value={0}>未支付</Select.Option>
              <Select.Option value={1}>已支付</Select.Option>
              <Select.Option value={2}>已过期</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="日期范围">
            <RangePicker 
              value={filter.dateRange}
              onChange={(dates) => setFilter({ ...filter, dateRange: dates })}
              style={{ width: 240 }}
            />
          </Form.Item>
          <Form.Item label="订单号">
            <Input
              value={filter.tradeNo}
              onChange={(e) => setFilter({ ...filter, tradeNo: e.target.value })}
              placeholder="平台/商户订单号"
              allowClear
              style={{ width: 180 }}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={() => fetchOrders(1)}>查询</Button>
            <Button onClick={resetFilter} style={{ marginLeft: 8 }}>重置</Button>
          </Form.Item>
        </Form>
      </div>

      {/* 订单表格 */}
      <div className="data-table">
        <Table
          columns={columns}
          dataSource={orders}
          loading={loading}
          rowKey="trade_no"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            pageSizeOptions: [20, 50, 100],
            onChange: (page, pageSize) => fetchOrders(page, pageSize)
          }}
          scroll={{ x: 'max-content' }}
          bordered
          style={{ width: '100%' }}
        />
      </div>

      {/* 订单详情弹窗 */}
      <Modal
        title="订单详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={780}
      >
        {currentOrder && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="平台订单号">{currentOrder.trade_no}</Descriptions.Item>
            <Descriptions.Item label="商户订单号">{currentOrder.out_trade_no}</Descriptions.Item>
            <Descriptions.Item label="商品名称">{currentOrder.name}</Descriptions.Item>
            <Descriptions.Item label="订单金额">¥{parseFloat(currentOrder.money).toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="手续费">
              {parseFloat(currentOrder.fee_money || 0) > 0 
                ? `¥${parseFloat(currentOrder.fee_money).toFixed(2)} (${currentOrder.fee_payer === 'buyer' ? '买家承担' : '商户承担'})`
                : '-'
              }
            </Descriptions.Item>
            <Descriptions.Item label="实收金额">
              {currentOrder.fee_payer === 'merchant' 
                ? `¥${(parseFloat(currentOrder.money) - parseFloat(currentOrder.fee_money || 0)).toFixed(2)}`
                : `¥${parseFloat(currentOrder.money).toFixed(2)}`
              }
            </Descriptions.Item>
            <Descriptions.Item label="支付方式">
              {(() => {
                const type = currentOrder.pay_type
                if (!type) return '-'
                const upperType = type.toUpperCase()
                if (cryptoIconMap[upperType]) return type
                const typeLabels = { alipay: '支付宝', wxpay: '微信支付', qqpay: 'QQ钱包', bank: '网银支付', jdpay: '京东支付', paypal: 'PayPal', ecny: '数字人民币' }
                return typeLabels[type] || type
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="订单状态">
              {(() => {
                const { text, color } = getOrderStatusDisplay(currentOrder)
                return <Tag color={color}>{text}</Tag>
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="访客IP">{currentOrder.ip || '-'}</Descriptions.Item>
            <Descriptions.Item label="时间">
              <div>创建: {formatTime(currentOrder.created_at)}</div>
              {currentOrder.paid_at && <div>支付: {formatTime(currentOrder.paid_at)}</div>}
            </Descriptions.Item>
            {(currentOrder.status === 1 || currentOrder.merchant_confirm === 1) && (
              <Descriptions.Item label="回调状态" span={2}>
                {currentOrder.notify_status === 1 ? (
                  <Tag color="success">已成功</Tag>
                ) : (
                  <Tag color="warning">未成功</Tag>
                )}
                {currentOrder.notify_count > 0 && (
                  <span style={{ marginLeft: 8, color: '#666' }}>
                    已回调 {currentOrder.notify_count} 次
                    {currentOrder.notify_time && <span style={{ marginLeft: 8 }}>({formatTime(currentOrder.notify_time)})</span>}
                  </span>
                )}
                {currentOrder.merchant_confirm === 1 && (
                  <Tag color="orange" style={{ marginLeft: 8 }}>商户认账</Tag>
                )}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="通知地址" span={2}>
              <span style={{ wordBreak: 'break-all', fontSize: 12 }}>{currentOrder.notify_url || '-'}</span>
            </Descriptions.Item>
            <Descriptions.Item label="跳转地址" span={2}>
              <span style={{ wordBreak: 'break-all', fontSize: 12 }}>{currentOrder.return_url || '-'}</span>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 退款弹窗 */}
      <Modal
        title="申请退款"
        open={refundVisible}
        onCancel={() => setRefundVisible(false)}
        onOk={submitRefund}
        confirmLoading={refundLoading}
        okButtonProps={{ disabled: refundQueryLoading || !refundInfo }}
        width={450}
      >
        {refundQueryLoading ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>正在查询退款信息...</div>
        ) : refundInfo ? (
          <Form layout="horizontal" labelCol={{ span: 6 }}>
            <Alert 
              message="此操作将直接原路退款该订单，退款金额将从您的商户余额中扣除。" 
              type="warning" 
              showIcon 
              style={{ marginBottom: 16 }}
            />
            <Form.Item label="订单金额">
              ¥{refundInfo.money}
            </Form.Item>
            {parseFloat(refundInfo.refundedMoney) > 0 && (
              <Form.Item label="已退金额">
                <span style={{ color: '#ff4d4f' }}>¥{refundInfo.refundedMoney}</span>
              </Form.Item>
            )}
            <Form.Item label="可退金额">
              <span style={{ color: '#52c41a', fontWeight: 500 }}>¥{refundInfo.maxRefund}</span>
            </Form.Item>
            <Form.Item label="退款金额" required>
              <InputNumber
                value={refundForm.money}
                onChange={(value) => setRefundForm({ ...refundForm, money: value })}
                min={0.01}
                max={parseFloat(refundInfo.maxRefund)}
                precision={2}
                style={{ width: '100%' }}
                addonBefore="¥"
              />
            </Form.Item>
            <Form.Item label="退款原因">
              <Input.TextArea
                value={refundForm.reason}
                onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                rows={2}
                placeholder="请输入退款原因（选填）"
              />
            </Form.Item>
          </Form>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>暂无退款信息</div>
        )}
      </Modal>
    </div>
  )
}

export default Orders

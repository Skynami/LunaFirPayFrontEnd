import { useState, useEffect } from 'react'
import { Table, Form, Input, Select, Button, Tag, Modal, InputNumber, Descriptions, Spin, message, Space } from 'antd'
import api from '../../utils/api'
import { formatTime } from '../../utils/time'
import { useUserStore } from '../../stores/userStore'

function Merchants() {
  const { isRam, hasRamPermission } = useUserStore()
  const canEditChannel = !isRam || hasRamPermission('channel')
  const canBalanceAdjust = !isRam || hasRamPermission('finance')

  const [loading, setLoading] = useState(false)

  // 商户列表
  const [merchants, setMerchants] = useState([])
  const [total, setTotal] = useState(0)
  const [searchForm, setSearchForm] = useState({ merchantId: '', name: '', status: '' })
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })

  // 编辑
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [editLoading, setEditLoading] = useState(false)

  // 详情
  const [showDetail, setShowDetail] = useState(false)
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // 支付组列表
  const [payGroups, setPayGroups] = useState([])

  // 余额增减
  const [showBalanceAdjust, setShowBalanceAdjust] = useState(false)
  const [balanceAdjustLoading, setBalanceAdjustLoading] = useState(false)
  const [balanceAdjustForm, setBalanceAdjustForm] = useState({
    merchantId: null,
    merchantNo: null,
    merchantName: '',
    amount: null,
    currentBalance: 0
  })

  const isEnabledStatus = (status) => status === 'active' || status === 'approved'

  const getStatusTag = (status) => {
    const map = {
      pending: { color: 'orange', text: '待审核' },
      inactive: { color: 'warning', text: '未开通' },
      active: { color: 'success', text: '正常' },
      paused: { color: 'warning', text: '已暂停' },
      approved: { color: 'success', text: '正常' },
      disabled: { color: 'warning', text: '已暂停' }
    }
    const v = map[status] || { color: 'default', text: status || '未知' }
    return <Tag color={v.color}>{v.text}</Tag>
  }

  const fetchMerchants = async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/merchants', {
        params: { page, pageSize, ...searchForm }
      })
      if (res.data.code === 0) {
        setMerchants(res.data.data.list || [])
        setTotal(res.data.data.total || 0)
        setPagination({ ...pagination, current: page, pageSize })
      }
    } catch (error) {
      message.error('获取商户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (v) => parseFloat(v || 0).toFixed(2)

  // 查看商户详情
  const viewDetail = async (row) => {
    setDetailData(row)
    setShowDetail(true)
    setDetailLoading(true)
    try {
      const res = await api.get('/api/admin/merchants/stats', { params: { merchantId: row.user_id } })
      if (res.data.code === 0) {
        setDetailData({ ...row, ...res.data.data })
      }
    } catch (error) {
      console.error('获取详情失败:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const editMerchant = (row) => {
    // 编辑时，解析已有的费率设置
    // 兼容旧格式：将小数转为百分比显示
    const normalizeRateForEdit = (rates) => {
      if (!rates) return null
      const result = {}
      for (const [key, val] of Object.entries(rates)) {
        const v = parseFloat(val)
        // 如果值 < 1，是旧的小数格式，需要 *100 转为百分比
        result[key] = v < 1 ? v * 100 : v
      }
      return Object.keys(result).length > 0 ? result : null
    }
    
    setEditForm({ 
      ...row,
      fee_rates: normalizeRateForEdit(row.fee_rates),
      pay_group_id: row.pay_group_id || null
    })
    setShowEdit(true)
  }

  const saveMerchant = async () => {
    setEditLoading(true)
    try {
      const submitData = {
        merchant_id: editForm.user_id,
        merchant_user_id: editForm.user_id,
        merchant_record_id: editForm.id,
        remark: editForm.remark,
        pay_group_id: editForm.pay_group_id || null,
        fee_rates: editForm.fee_rates || null,
        // 清除旧的统一费率，改用 fee_rates 通道独立费率
        fee_rate: null
      }
      
      const res = await api.post('/api/admin/merchants/update', submitData)
      if (res.data.code === 0) {
        message.success('保存成功')
        setShowEdit(false)
        fetchMerchants()
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('保存失败')
    } finally {
      setEditLoading(false)
    }
  }

  const createMerchantUser = async () => {
    let emailValue = ''
    Modal.confirm({
      title: '创建商户账号',
      content: (
        <div>
          <p style={{ marginBottom: 12 }}>将生成随机用户名与密码（请及时保存）</p>
          <Input 
            placeholder="请输入商户邮箱（必填）" 
            onChange={(e) => { emailValue = e.target.value }}
          />
        </div>
      ),
      onOk: async () => {
        if (!emailValue || !emailValue.trim()) {
          message.error('请输入邮箱')
          return Promise.reject()
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(emailValue)) {
          message.error('邮箱格式不正确')
          return Promise.reject()
        }
        try {
          const res = await api.post('/api/admin/merchants/create-user', { email: emailValue.trim() })
          if (res.data.code === 0) {
            const data = res.data.data || {}
            Modal.info({
              title: '创建成功（请保存）',
              content: (
                <div style={{ fontFamily: 'monospace' }}>
                  <div>userId: {data.userId}</div>
                  <div>username: {data.username}</div>
                  <div>password: {data.password}</div>
                  <div>email: {data.email}</div>
                </div>
              )
            })
            fetchMerchants(1)
          } else {
            message.error(res.data.msg)
          }
        } catch (e) {
          message.error('创建失败')
        }
      }
    })
  }

  const activateMerchant = async (row) => {
    Modal.confirm({
      title: '开通商户',
      content: '开通后将生成 PID/KEY（请告知商户妥善保存）。确定开通吗？',
      onOk: async () => {
        try {
          const res = await api.post('/api/admin/merchants/activate', { merchantId: row.user_id })
          if (res.data.code === 0) {
            const data = res.data.data || {}
            if (data.pid || data.apiKey) {
              Modal.info({
                title: '已开通（请保存）',
                content: (
                  <div style={{ fontFamily: 'monospace' }}>
                    <div>PID: {data.pid || '-'}</div>
                    <div>KEY: {data.apiKey || '-'}</div>
                  </div>
                )
              })
            } else {
              message.success(res.data.msg || '已开通')
            }
            fetchMerchants()
          } else {
            message.error(res.data.msg)
          }
        } catch (e) {
          message.error('开通失败')
        }
      }
    })
  }

  const pauseMerchant = async (row) => {
    Modal.confirm({
      title: '暂停商户',
      content: '暂停后该商户将无法发起支付。确定暂停吗？',
      onOk: async () => {
        try {
          const res = await api.post('/api/admin/merchants/pause', { merchantId: row.user_id })
          if (res.data.code === 0) {
            message.success('已暂停')
            fetchMerchants()
          } else {
            message.error(res.data.msg)
          }
        } catch (e) {
          message.error('操作失败')
        }
      }
    })
  }

  const restoreMerchant = async (row) => {
    Modal.confirm({
      title: '恢复商户',
      content: '恢复后该商户可继续发起支付。确定恢复吗？',
      onOk: async () => {
        try {
          const res = await api.post('/api/admin/merchants/restore', { merchantId: row.user_id })
          if (res.data.code === 0) {
            message.success('已恢复')
            fetchMerchants()
          } else {
            message.error(res.data.msg)
          }
        } catch (e) {
          message.error('操作失败')
        }
      }
    })
  }

  const resetMerchantPassword = async (row) => {
    Modal.confirm({
      title: '重置商户密码',
      content: '将生成新的12位随机密码（请及时保存并发给商户）。确定重置吗？',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await api.post('/api/admin/merchants/reset-password', { merchantId: row.user_id })
          if (res.data.code === 0) {
            const pwd = res.data.data?.password
            Modal.info({
              title: '重置成功（新密码）',
              content: <div style={{ fontFamily: 'monospace' }}>{pwd || '-'}</div>
            })
          } else {
            message.error(res.data.msg)
          }
        } catch (e) {
          message.error('重置失败')
        }
      }
    })
  }

  const openBalanceAdjust = (row) => {
    setBalanceAdjustForm({
      merchantId: row.user_id,
      merchantNo: row.id,
      merchantName: row.username || row.name || '-',
      amount: null,
      currentBalance: parseFloat(row.balance || 0)
    })
    setShowBalanceAdjust(true)
  }

  const submitBalanceAdjust = async () => {
    const amount = Number(balanceAdjustForm.amount)
    if (!Number.isFinite(amount) || amount === 0) {
      message.error('请输入非0的增减金额')
      return
    }

    setBalanceAdjustLoading(true)
    try {
      const res = await api.post('/api/admin/merchants/adjust-balance', {
        merchantId: balanceAdjustForm.merchantId,
        amount
      })
      if (res.data.code === 0) {
        message.success(res.data.msg || '余额调整成功')
        setShowBalanceAdjust(false)
        fetchMerchants()

        // 若详情弹窗当前就是同一商户，同步显示余额
        if (detailData && detailData.user_id === balanceAdjustForm.merchantId && res.data.data) {
          setDetailData({ ...detailData, balance: res.data.data.afterBalance })
        }
      } else {
        message.error(res.data.msg || '余额调整失败')
      }
    } catch (error) {
      message.error('余额调整失败')
    } finally {
      setBalanceAdjustLoading(false)
    }
  }

  useEffect(() => {
    fetchMerchants()
    fetchPayGroups()
  }, [])

  // 获取支付组列表
  const fetchPayGroups = async () => {
    try {
      const res = await api.get('/api/admin/pay/pay-groups')
      if (res.data.code === 0) {
        setPayGroups(res.data.data || [])
      }
    } catch (error) {
      console.error('获取支付组失败:', error)
    }
  }

  // 获取支付组名称
  const getPayGroupName = (payGroupId) => {
    if (!payGroupId) return '使用默认组'
    const group = payGroups.find(g => g.id === payGroupId)
    return group ? group.name : '未知'
  }

  // 支付组渲染组件
  const PayGroupCell = ({ value }) => {
    if (!value) return null
    const group = payGroups.find(g => g.id === value)
    if (!group) return null
    return <Tag color="blue">{group.name}</Tag>
  }

  // 获取支付组中已启用的支付类型列表
  const getActivePayTypes = (rates) => {
    if (!rates || Object.keys(rates).length === 0) return []
    return Object.entries(rates).map(([key, val]) => ({ key, ...val }))
  }

  const merchantColumns = [
    { title: '商户号', dataIndex: 'id', width: 70 },
    { title: '登录账号', dataIndex: 'username', width: 120, ellipsis: true },
    { title: '备注', dataIndex: 'remark', width: 100, ellipsis: true, render: (v) => v || <span style={{ color: '#999' }}>-</span> },
    {
      title: '支付组',
      dataIndex: 'pay_group_name',
      width: 80,
      render: (v) => v ? <Tag color="blue">{v}</Tag> : <span style={{ color: '#999' }}>默认</span>
    },
    {
      title: '费率',
      dataIndex: 'rates',
      width: 90,
      align: 'center',
      render: (rates, row) => {
        // 智能转换费率为百分比显示
        // 兼容旧格式(0.006=0.6%)和新格式(6=6%)
        const normalizeToPercent = (v) => {
          const val = parseFloat(v)
          if (isNaN(val)) return null
          // 如果值 >= 1，已经是百分比；否则是小数需要 *100
          return val >= 1 ? val : val * 100
        }
        
        // 获取支付宝费率
        let alipayRate = '-'
        if (row.fee_rates?.alipay !== undefined) {
          const pct = normalizeToPercent(row.fee_rates.alipay)
          alipayRate = pct !== null ? pct.toFixed(1) + '%' : '-'
        } else if (rates?.alipay?.rate !== undefined) {
          // rates.alipay.rate 是后端返回的小数格式
          alipayRate = (parseFloat(rates.alipay.rate) * 100).toFixed(1) + '%'
        }
        // 获取微信费率
        let wxpayRate = '-'
        if (row.fee_rates?.wxpay !== undefined) {
          const pct = normalizeToPercent(row.fee_rates.wxpay)
          wxpayRate = pct !== null ? pct.toFixed(1) + '%' : '-'
        } else if (rates?.wxpay?.rate !== undefined) {
          wxpayRate = (parseFloat(rates.wxpay.rate) * 100).toFixed(1) + '%'
        }
        return <span style={{ color: '#1890ff' }}>{alipayRate}/{wxpayRate}</span>
      }
    },
    {
      title: '今日',
      dataIndex: 'day_money',
      width: 90,
      align: 'right',
      render: (v) => <span style={{ color: '#1890ff' }}>¥{formatMoney(v)}</span>
    },
    {
      title: '昨日',
      dataIndex: 'yesterday_money',
      width: 90,
      align: 'right',
      render: (v) => <span style={{ color: '#1890ff' }}>¥{formatMoney(v)}</span>
    },
    {
      title: '本周',
      dataIndex: 'week_money',
      width: 100,
      align: 'right',
      render: (v) => <span style={{ color: '#1890ff' }}>¥{formatMoney(v)}</span>
    },
    {
      title: '余额',
      dataIndex: 'balance',
      width: 100,
      align: 'right',
      render: (v) => <span style={{ color: '#722ed1', fontWeight: 600 }}>¥{formatMoney(v)}</span>
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 70,
      align: 'center',
      render: (v) => getStatusTag(v)
    },
    {
      title: '操作',
      width: 230,
      fixed: 'right',
      render: (_, row) => (
        <>
          <Button type="link" size="small" onClick={() => viewDetail(row)}>详情</Button>
          <Button type="link" size="small" onClick={() => editMerchant(row)}>编辑</Button>
          {canBalanceAdjust && (
            <Button type="link" size="small" onClick={() => openBalanceAdjust(row)}>余额增减</Button>
          )}
          {(row.status === 'inactive' || row.status === 'pending') && (
            <Button type="link" size="small" onClick={() => activateMerchant(row)}>开通</Button>
          )}
          {isEnabledStatus(row.status) && (
            <>
              <Button type="link" size="small" onClick={() => pauseMerchant(row)}>暂停</Button>
              <Button type="link" size="small" danger onClick={() => resetMerchantPassword(row)}>重置密码</Button>
            </>
          )}
          {(row.status === 'paused' || row.status === 'disabled') && (
            <>
              <Button type="link" size="small" onClick={() => restoreMerchant(row)}>恢复</Button>
              <Button type="link" size="small" danger onClick={() => resetMerchantPassword(row)}>重置密码</Button>
            </>
          )}
        </>
      )
    }
  ]

  return (
    <div>
      <h2 className="page-title">商户管理</h2>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <Form layout="inline">
          <Form.Item label="商户号">
            <Input
              value={searchForm.merchantId}
              onChange={(e) => setSearchForm({ ...searchForm, merchantId: e.target.value })}
              placeholder="输入商户号"
              allowClear
              style={{ width: 150 }}
            />
          </Form.Item>
          <Form.Item label="商户名">
            <Input
              value={searchForm.name}
              onChange={(e) => setSearchForm({ ...searchForm, name: e.target.value })}
              placeholder="输入名称"
              allowClear
              style={{ width: 150 }}
            />
          </Form.Item>
          <Form.Item label="状态">
            <Select
              value={searchForm.status}
              onChange={(v) => setSearchForm({ ...searchForm, status: v })}
              placeholder="全部"
              allowClear
              style={{ width: 100 }}
            >
              <Select.Option value="pending">待审核</Select.Option>
              <Select.Option value="inactive">未开通</Select.Option>
              <Select.Option value="active">正常</Select.Option>
              <Select.Option value="paused">已暂停</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={() => fetchMerchants(1)}>搜索</Button>
          </Form.Item>
          <Form.Item>
            <Button onClick={createMerchantUser}>创建商户</Button>
          </Form.Item>
        </Form>
      </div>
      
      <Table
        columns={merchantColumns}
        dataSource={merchants}
        loading={loading}
        rowKey="id"
        pagination={{
          ...pagination,
          total,
          showSizeChanger: true,
          pageSizeOptions: [20, 50],
          onChange: (page, pageSize) => fetchMerchants(page, pageSize)
        }}
        scroll={{ x: 'max-content' }}
        style={{ width: '100%' }}
        bordered
      />

      {/* 商户详情弹窗 */}
      <Modal
        title="商户详情"
        open={showDetail}
        onCancel={() => setShowDetail(false)}
        footer={null}
        width={650}
      >
        <Spin spinning={detailLoading}>
          {detailData && (
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="商户号">{detailData.id}</Descriptions.Item>
              <Descriptions.Item label="商户名">{detailData.name}</Descriptions.Item>
              <Descriptions.Item label="登录账号">{detailData.username}</Descriptions.Item>
              <Descriptions.Item label="备注">{detailData.remark || '-'}</Descriptions.Item>
              <Descriptions.Item label="联系方式">{detailData.contact || '-'}</Descriptions.Item>
              <Descriptions.Item label="费率">
                {detailData.fee_rate !== null && detailData.fee_rate !== undefined 
                  ? <span style={{ color: '#1890ff' }}>
                      {/* 兼容旧格式(0.006)和新格式(6) */}
                      {(parseFloat(detailData.fee_rate) >= 1 
                        ? parseFloat(detailData.fee_rate) 
                        : parseFloat(detailData.fee_rate) * 100
                      ).toFixed(2)}%
                    </span>
                  : <span style={{ color: '#999' }}>默认通道费率</span>}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(detailData.status)}
              </Descriptions.Item>
              <Descriptions.Item label="当前余额">
                <span style={{ color: '#722ed1', fontWeight: 600 }}>¥{formatMoney(detailData.balance)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="加入时间">{formatTime(detailData.joined_at)}</Descriptions.Item>
              
              <Descriptions.Item label="今日交易额" span={1}>
                <span style={{ color: '#1890ff', fontWeight: 600 }}>¥{formatMoney(detailData.day_money)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="今日手续费" span={1}>
                <span style={{ color: '#52c41a', fontWeight: 600 }}>¥{formatMoney(detailData.day_fee)}</span>
              </Descriptions.Item>
              
              <Descriptions.Item label="本周交易额" span={1}>
                <span style={{ color: '#1890ff', fontWeight: 600 }}>¥{formatMoney(detailData.week_money)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="本周手续费" span={1}>
                <span style={{ color: '#52c41a', fontWeight: 600 }}>¥{formatMoney(detailData.week_fee)}</span>
              </Descriptions.Item>
              
              <Descriptions.Item label="本月交易额" span={1}>
                <span style={{ color: '#1890ff', fontWeight: 600 }}>¥{formatMoney(detailData.month_money)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="本月手续费" span={1}>
                <span style={{ color: '#52c41a', fontWeight: 600 }}>¥{formatMoney(detailData.month_fee)}</span>
              </Descriptions.Item>
              
              <Descriptions.Item label="累计交易额" span={1}>
                <span style={{ color: '#1890ff', fontWeight: 600, fontSize: 16 }}>¥{formatMoney(detailData.total_money)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="累计手续费" span={1}>
                <span style={{ color: '#52c41a', fontWeight: 600, fontSize: 16 }}>¥{formatMoney(detailData.total_fee)}</span>
              </Descriptions.Item>
            </Descriptions>
          )}
        </Spin>
      </Modal>

      {/* 余额增减弹窗 */}
      <Modal
        title="余额增减"
        open={showBalanceAdjust}
        onCancel={() => setShowBalanceAdjust(false)}
        onOk={submitBalanceAdjust}
        confirmLoading={balanceAdjustLoading}
      >
        <Form layout="vertical">
          <Form.Item label="商户">
            <div>#{balanceAdjustForm.merchantNo || '-'} / {balanceAdjustForm.merchantName || '-'}</div>
          </Form.Item>
          <Form.Item label="当前余额">
            <span style={{ color: '#722ed1', fontWeight: 600 }}>¥{formatMoney(balanceAdjustForm.currentBalance)}</span>
          </Form.Item>
          <Form.Item label="增减金额">
            <InputNumber
              style={{ width: '100%' }}
              value={balanceAdjustForm.amount}
              onChange={(v) => setBalanceAdjustForm({ ...balanceAdjustForm, amount: v })}
              precision={2}
              placeholder="例如：100 或 -100"
            />
          </Form.Item>
          <div style={{ color: '#999', fontSize: 12 }}>
            直接输入数字：正数表示增加余额，负数表示减少余额。
          </div>
        </Form>
      </Modal>

      {/* 编辑商户弹窗 */}
      <Modal
        title="编辑商户"
        open={showEdit}
        onCancel={() => setShowEdit(false)}
        onOk={saveMerchant}
        confirmLoading={editLoading}
        width={550}
      >
        {editForm && (
          <Form layout="horizontal" labelCol={{ span: 6 }}>
            <Form.Item label="商户号">
              <span>{editForm.id}</span>
            </Form.Item>
            <Form.Item label="登录账号">
              <span style={{ color: '#666' }}>{editForm.username}</span>
              <span style={{ color: '#999', fontSize: 12, marginLeft: 8 }}>(不可修改)</span>
            </Form.Item>
            <Form.Item label="备注">
              <Input.TextArea
                value={editForm.remark}
                onChange={(e) => setEditForm({ ...editForm, remark: e.target.value })}
                placeholder="商户备注信息"
                rows={2}
              />
            </Form.Item>
            <Form.Item label="通道费率">
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>支付宝</div>
                  <Space.Compact>
                    <InputNumber
                      value={editForm.fee_rates?.alipay ?? null}
                      onChange={(v) => {
                        const newRates = { ...(editForm.fee_rates || {}) }
                        if (v === null || v === undefined) {
                          delete newRates.alipay
                        } else {
                          newRates.alipay = v
                        }
                        setEditForm({ ...editForm, fee_rates: Object.keys(newRates).length > 0 ? newRates : null })
                      }}
                      min={0}
                      max={100}
                      step={0.01}
                      precision={2}
                      placeholder={editForm.rates?.alipay?.rate !== undefined ? `${(editForm.rates.alipay.rate * 100).toFixed(1)}` : '通道'}
                      style={{ width: 80 }}
                      disabled={!canEditChannel}
                    />
                    <Button disabled style={{ cursor: 'default' }}>%</Button>
                  </Space.Compact>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>微信支付</div>
                  <Space.Compact>
                    <InputNumber
                      value={editForm.fee_rates?.wxpay ?? null}
                      onChange={(v) => {
                        const newRates = { ...(editForm.fee_rates || {}) }
                        if (v === null || v === undefined) {
                          delete newRates.wxpay
                        } else {
                          newRates.wxpay = v
                        }
                        setEditForm({ ...editForm, fee_rates: Object.keys(newRates).length > 0 ? newRates : null })
                      }}
                      min={0}
                      max={100}
                      step={0.01}
                      precision={2}
                      placeholder={editForm.rates?.wxpay?.rate !== undefined ? `${(editForm.rates.wxpay.rate * 100).toFixed(1)}` : '通道'}
                      style={{ width: 80 }}
                      disabled={!canEditChannel}
                    />
                    <Button disabled style={{ cursor: 'default' }}>%</Button>
                  </Space.Compact>
                </div>
              </div>
              <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                {!canEditChannel ? '无通道权限，不可修改费率' : '留空表示使用支付组默认费率'}
              </div>
            </Form.Item>
            <Form.Item label="支付组">
              <Select
                value={editForm.pay_group_id}
                onChange={(v) => setEditForm({ ...editForm, pay_group_id: v })}
                allowClear
                placeholder="使用默认支付组"
                style={{ width: '100%' }}
                disabled={!canEditChannel}
              >
                {payGroups.map(g => (
                  <Select.Option key={g.id} value={g.id}>
                    {g.name} {g.is_default === 1 && <Tag color="gold" style={{ marginLeft: 8 }}>默认</Tag>}
                  </Select.Option>
                ))}
              </Select>
              <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                {!canEditChannel ? '无通道权限，不可修改支付组' : '留空表示使用系统默认支付组'}
              </div>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

export default Merchants

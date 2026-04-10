import { useState, useEffect } from 'react'
import { Card, Table, Tag, Checkbox, Button, message, Space, Row, Col, Descriptions, Empty, Modal, InputNumber, Select, Tabs, Badge, Popconfirm, Input, Statistic, Typography, Form, Grid } from 'antd'
import { SettingOutlined, SaveOutlined, CheckOutlined, CloseOutlined, WalletOutlined, HistoryOutlined, AuditOutlined, EditOutlined, PlusOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons'
import api from '../../utils/api'
import { useUserStore } from '../../stores/userStore'

const { Option } = Select
const { Text } = Typography
const { useBreakpoint } = Grid

// 加密货币网络选项
const CRYPTO_NETWORKS = [
  { label: 'TRC20 (TRON)', value: 'TRC20' },
  { label: 'ERC20 (Ethereum)', value: 'ERC20' },
  { label: 'BEP20 (BSC)', value: 'BEP20' },
  { label: 'Polygon', value: 'POLYGON' },
  { label: 'Solana', value: 'SOL' },
]

function Settlements() {
  const screens = useBreakpoint()
  const shouldMaskCryptoAddress = !screens.lg

  const { isRam, hasRamPermission } = useUserStore()
  const canManualBatchSettle = !isRam || hasRamPermission('finance')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [options, setOptions] = useState({
    alipay_enabled: false,
    wxpay_enabled: false,
    bank_enabled: false,
    crypto_enabled: false,
    crypto_networks: [],
    settle_rate: 0,
    settle_fee_min: 0,
    settle_fee_max: 0,
    min_settle_amount: 10,
    settle_cycle: 1,
    auto_settle: false,
    auto_settle_cycle: 0,
    auto_settle_amount: 0,
    auto_settle_type: ''  // 强制结算方式：空=商户默认, alipay/wxpay/bank/crypto
  })

  const [merchants, setMerchants] = useState([])
  const [merchantsLoading, setMerchantsLoading] = useState(false)

  // Tab 控制：结算记录/ 结算设置 / 结算审核
  const [activeTab, setActiveTab] = useState('records')

  // 结算记录（全部）
  const [allRecords, setAllRecords] = useState([])
  const [allRecordsLoading, setAllRecordsLoading] = useState(false)
  const [allRecordsTotal, setAllRecordsTotal] = useState(0)
  const [allRecordsPage, setAllRecordsPage] = useState(1)
  const [allFilterStatus, setAllFilterStatus] = useState('')

  // 审核相关（待审核）
  const [withdrawRecords, setWithdrawRecords] = useState([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [recordsTotal, setRecordsTotal] = useState(0)
  const [recordsPage, setRecordsPage] = useState(1)
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingAmount, setPendingAmount] = useState(0)
  const [manualSettling, setManualSettling] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  // 商户结算详情弹窗
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [detailMerchant, setDetailMerchant] = useState(null)
  
  // 编辑商户结算方式弹窗
  const [editSettleModalVisible, setEditSettleModalVisible] = useState(false)
  const [editingSettle, setEditingSettle] = useState(null)
  const [editSettleForm] = Form.useForm()
  const [editSettleSaving, setEditSettleSaving] = useState(false)

  // 获取结算选项
  const fetchOptions = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/settlement/options')
      if (res.data.code === 0) {
        setOptions({
          alipay_enabled: res.data.data.alipay_enabled === 1,
          wxpay_enabled: res.data.data.wxpay_enabled === 1,
          bank_enabled: res.data.data.bank_enabled === 1,
          crypto_enabled: res.data.data.crypto_enabled === 1,
          crypto_networks: res.data.data.crypto_networks || [],
          settle_rate: parseFloat(res.data.data.settle_rate || 0),
          settle_fee_min: parseFloat(res.data.data.settle_fee_min || 0),
          settle_fee_max: parseFloat(res.data.data.settle_fee_max || 0),
          min_settle_amount: parseFloat(res.data.data.min_settle_amount || 10),
          settle_cycle: res.data.data.settle_cycle ?? 1,
          auto_settle: res.data.data.auto_settle === 1,
          auto_settle_cycle: res.data.data.auto_settle_cycle ?? 0,
          auto_settle_amount: parseFloat(res.data.data.auto_settle_amount || 0),
          auto_settle_type: res.data.data.auto_settle_type || ''
        })
      }
    } catch (error) {
      console.error('获取结算选项失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 保存结算选项
  const saveOptions = async () => {
    setSaving(true)
    try {
      // 保存结算方式
      await api.post('/api/admin/settlement/options', {
        alipay_enabled: options.alipay_enabled,
        wxpay_enabled: options.wxpay_enabled,
        bank_enabled: options.bank_enabled,
        crypto_enabled: options.crypto_enabled,
        crypto_networks: options.crypto_networks
      })

      // 保存费率和周期 & 自动结算
      const res = await api.post('/api/admin/settlement/fee-config', {
        settle_rate: options.settle_rate,
        settle_fee_min: options.settle_fee_min,
        settle_fee_max: options.settle_fee_max,
        min_settle_amount: options.min_settle_amount,
        settle_cycle: options.settle_cycle,
        auto_settle: options.auto_settle,
        auto_settle_cycle: options.auto_settle_cycle,
        auto_settle_amount: options.auto_settle_amount,
        auto_settle_type: options.auto_settle_type
      })

      if (res.data.code === 0) {
        message.success('保存成功')
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 获取商户结算信息
  const fetchMerchants = async () => {
    setMerchantsLoading(true)
    try {
      const res = await api.get('/api/admin/settlement/merchants')
      if (res.data.code === 0) {
        setMerchants(res.data.data)
      }
    } catch (error) {
      console.error('获取商户结算信息失败:', error)
    } finally {
      setMerchantsLoading(false)
    }
  }

  // 获取全部结算记录
  const fetchAllRecords = async (page = 1) => {
    setAllRecordsLoading(true)
    try {
      const params = { page, pageSize: 20, status: allFilterStatus }
      const res = await api.get('/api/admin/withdraw/records', { params })
      if (res.data.code === 0) {
        setAllRecords(res.data.data.records)
        setAllRecordsTotal(res.data.data.total)
        setAllRecordsPage(page)
        setPendingCount(res.data.data.pendingCount)
        setPendingAmount(res.data.data.pendingAmount)
      }
    } catch (error) {
      console.error('获取结算记录失败:', error)
    } finally {
      setAllRecordsLoading(false)
    }
  }

  // 获取待审核记录（status 固定 0）
  const fetchWithdrawRecords = async (page = 1) => {
    setRecordsLoading(true)
    try {
      const params = { page, pageSize: 20, status: '0' }
      const res = await api.get('/api/admin/withdraw/records', { params })
      if (res.data.code === 0) {
        setWithdrawRecords(res.data.data.records)
        setRecordsTotal(res.data.data.total)
        setRecordsPage(page)
        setPendingCount(res.data.data.pendingCount)
        setPendingAmount(res.data.data.pendingAmount)
      }
    } catch (error) {
      console.error('获取提现申请失败:', error)
    } finally {
      setRecordsLoading(false)
    }
  }
  
  // 审核通过
  const approveWithdraw = async (id) => {
    try {
      const res = await api.post('/api/admin/withdraw/approve', { id })
      if (res.data.code === 0) {
        message.success('已审核通过')
        fetchWithdrawRecords(recordsPage)
        fetchMerchants()
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('操作失败')
    }
  }
  
  // 打开拒绝弹窗
  const openRejectModal = (id) => {
    setRejectingId(id)
    setRejectReason('')
    setRejectModalVisible(true)
  }
  
  // 拒绝提现
  const rejectWithdraw = async () => {
    if (!rejectReason.trim()) {
      message.warning('请填写拒绝原因')
      return
    }
    try {
      const res = await api.post('/api/admin/withdraw/reject', { id: rejectingId, remark: rejectReason })
      if (res.data.code === 0) {
        message.success('已拒绝')
        setRejectModalVisible(false)
        fetchWithdrawRecords(recordsPage)
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('操作失败')
    }
  }
  
  // 批量审核
  const batchApprove = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要审核的记录')
      return
    }
    try {
      const res = await api.post('/api/admin/withdraw/batch-approve', { ids: selectedRowKeys })
      if (res.data.code === 0) {
        message.success(res.data.msg)
        setSelectedRowKeys([])
        fetchWithdrawRecords(recordsPage)
        fetchMerchants()
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('操作失败')
    }
  }

  // 手动触发批量结算
  const triggerManualBatchSettle = async () => {
    setManualSettling(true)
    try {
      const res = await api.post('/api/admin/settlement/manual-batch')
      if (res.data.code !== 0) {
        message.error(res.data.msg || '手动批量结算失败')
        return
      }

      const result = res.data.data || {}
      if (result.skipped) {
        message.warning(res.data.msg || '本次未触发结算')
        return
      }

      message.success(res.data.msg || '手动批量结算执行成功')
      fetchAllRecords(1)
      fetchWithdrawRecords(1)
      fetchMerchants()
    } catch (error) {
      message.error('手动批量结算失败')
    } finally {
      setManualSettling(false)
    }
  }
  
  // 打开编辑商户结算方式弹窗
  const openEditSettleModal = (settle = null) => {
    setEditingSettle(settle)
    if (settle) {
      editSettleForm.setFieldsValue({
        settle_type: settle.settle_type,
        account_name: settle.account_name,
        account_no: settle.account_no,
        bank_name: settle.bank_name,
        bank_branch: settle.bank_branch,
        crypto_network: settle.crypto_network,
        crypto_address: settle.crypto_address,
        is_default: settle.is_default === 1
      })
    } else {
      editSettleForm.resetFields()
    }
    setEditSettleModalVisible(true)
  }
  
  // 保存商户结算方式
  const saveSettleMethod = async () => {
    try {
      const values = await editSettleForm.validateFields()
      setEditSettleSaving(true)
      
      const res = await api.post('/api/admin/settlement/merchant/save', {
        merchant_id: detailMerchant.user_id,
        settle_type: values.settle_type,
        account_name: values.account_name,
        account_no: values.account_no,
        bank_name: values.bank_name,
        bank_branch: values.bank_branch,
        crypto_network: values.crypto_network,
        crypto_address: values.crypto_address,
        is_default: values.is_default ? 1 : 0
      })
      
      if (res.data.code === 0) {
        message.success('保存成功')
        setEditSettleModalVisible(false)
        // 刷新商户数据并更新详情弹窗
        const merchantRes = await api.get('/api/admin/settlement/merchants')
        if (merchantRes.data.code === 0) {
          setMerchants(merchantRes.data.data)
          // 更新详情弹窗中的数据
          const updated = merchantRes.data.data.find(m => m.user_id === detailMerchant.user_id)
          if (updated) setDetailMerchant(updated)
        }
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      if (error.errorFields) return
      message.error('保存失败')
    } finally {
      setEditSettleSaving(false)
    }
  }
  
  // 删除商户结算方式
  const deleteSettleMethod = async (settle) => {
    try {
      const res = await api.post('/api/admin/settlement/merchant/delete', {
        id: settle.id,
        merchant_id: detailMerchant.user_id
      })
      
      if (res.data.code === 0) {
        message.success('删除成功')
        // 刷新商户数据并更新详情弹窗
        const merchantRes = await api.get('/api/admin/settlement/merchants')
        if (merchantRes.data.code === 0) {
          setMerchants(merchantRes.data.data)
          const updated = merchantRes.data.data.find(m => m.user_id === detailMerchant.user_id)
          if (updated) setDetailMerchant(updated)
        }
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  useEffect(() => {
    fetchOptions()
    fetchMerchants()
    fetchAllRecords()
    fetchWithdrawRecords()
  }, [])

  useEffect(() => {
    if (activeTab === 'records') {
      fetchAllRecords(1)
    } else if (activeTab === 'audit') {
      fetchWithdrawRecords(1)
    }
  }, [activeTab])

  useEffect(() => {
    fetchAllRecords(1)
  }, [allFilterStatus])

  const formatMoney = (v) => parseFloat(v || 0).toFixed(2)

  const formatCryptoAddress = (address) => {
    if (!address) return '-'
    if (!shouldMaskCryptoAddress) return address
    if (address.length <= 12) return address
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }

  const copyToClipboard = async (text) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      message.success('地址已复制')
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const copied = document.execCommand('copy')
      document.body.removeChild(textArea)
      if (copied) {
        message.success('地址已复制')
      } else {
        message.error('复制失败，请手动复制')
      }
    }
  }

  const getSettleTypeName = (type) => {
    const names = { alipay: '支付宝', wxpay: '微信', bank: '银行卡', crypto: '加密货币' }
    return names[type] || type
  }

  const getSettleTypeColor = (type) => {
    const colors = { alipay: 'blue', wxpay: 'green', bank: 'orange', crypto: 'purple' }
    return colors[type] || 'default'
  }
  
  const getStatusTag = (status) => {
    const configs = {
      0: { color: 'orange', text: '待审核' },
      1: { color: 'green', text: '已完成' },
      2: { color: 'blue', text: '处理中' },
      3: { color: 'red', text: '已拒绝' }
    }
    const cfg = configs[status] || { color: 'default', text: '未知' }
    return <Tag color={cfg.color}>{cfg.text}</Tag>
  }

  // 查看商户结算详情
  const viewSettlementDetail = (merchant) => {
    setDetailMerchant(merchant)
    setDetailModalVisible(true)
  }

  const merchantColumns = [
    { 
      title: '商户', 
      width: 150,
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.username || '-'}</div>
          <div style={{ fontSize: 12, color: '#999' }}>PID: {row.pid}</div>
        </div>
      )
    },
    { 
      title: '余额', 
      dataIndex: 'balance', 
      width: 120,
      align: 'right',
      render: (v) => <span style={{ color: '#1890ff', fontWeight: 500 }}>¥{formatMoney(v)}</span>
    },
    {
      title: '结算方式',
      width: 200,
      render: (_, row) => {
        const settlements = row.settlements || []
        if (settlements.length === 0) {
          return <span style={{ color: '#999' }}>未设置</span>
        }
        return (
          <Space wrap size={[4, 4]}>
            {settlements.map((s, idx) => (
              <Tag key={idx} color={getSettleTypeColor(s.settle_type)}>
                {getSettleTypeName(s.settle_type)}
                {s.is_default === 1 && ' ★'}
              </Tag>
            ))}
          </Space>
        )
      }
    },
    { 
      title: '邮箱', 
      dataIndex: 'email', 
      width: 180,
      ellipsis: true
    },
    {
      title: '操作',
      width: 100,
      render: (_, row) => (
        <Button type="link" size="small" onClick={() => viewSettlementDetail(row)}>
          查看详情
        </Button>
      )
    }
  ]
  
  // 结算记录列（不含操作）
  const recordColumns = [
    {
      title: '结算单号',
      dataIndex: 'settle_no',
      width: 180,
      render: (v) => <Text copyable={{ text: v }} style={{ fontSize: 12 }}>{v}</Text>
    },
    {
      title: '商户',
      dataIndex: 'merchant_name',
      width: 100
    },
    {
      title: '结算方式',
      dataIndex: 'settle_type',
      width: 90,
      render: (v) => <Tag color={getSettleTypeColor(v)}>{getSettleTypeName(v)}</Tag>
    },
    {
      title: '收款账户',
      width: 160,
      render: (_, row) => {
        if (row.settle_type === 'crypto') {
          const cryptoAddress = row.crypto_address || ''
          return (
            <div style={{ fontSize: 12 }}>
              <div>{row.crypto_network}</div>
              <div style={{ color: '#999', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ wordBreak: shouldMaskCryptoAddress ? 'normal' : 'break-all' }}>{formatCryptoAddress(cryptoAddress)}</span>
                {cryptoAddress ? (
                  <Button
                    type="link"
                    size="small"
                    icon={<CopyOutlined />}
                    style={{ padding: 0, height: 'auto' }}
                    aria-label="复制地址"
                    onClick={() => copyToClipboard(cryptoAddress)}
                  />
                ) : null}
              </div>
            </div>
          )
        }
        return (
          <div style={{ fontSize: 12 }}>
            <div>{row.account_name}</div>
            <div style={{ color: '#999' }}>{row.account_no}</div>
          </div>
        )
      }
    },
    {
      title: '申请金额',
      dataIndex: 'amount',
      width: 100,
      align: 'right',
      render: (v) => `¥${formatMoney(v)}`
    },
    {
      title: '手续费',
      dataIndex: 'fee',
      width: 80,
      align: 'right',
      render: (v) => <Text type="secondary">¥{formatMoney(v)}</Text>
    },
    {
      title: '实际到账',
      dataIndex: 'real_amount',
      width: 100,
      align: 'right',
      render: (v) => <Text type="success" strong>¥{formatMoney(v)}</Text>
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (v) => getStatusTag(v)
    },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      width: 160,
      render: (v) => v ? new Date(v).toLocaleString('zh-CN') : '-'
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 120,
      ellipsis: true
    },
  ]

  // 审核表格列（附带操作）
  const auditColumns = [
    ...recordColumns,
    {
      title: '操作',
      width: 140,
      fixed: 'right',
      render: (_, row) => row.status === 0 && (
        <Space>
          <Popconfirm title="确定审核通过？将扣除商户余额" onConfirm={() => approveWithdraw(row.id)}>
            <Button type="link" size="small" icon={<CheckOutlined />} style={{ color: '#52c41a' }}>通过</Button>
          </Popconfirm>
          <Button type="link" size="small" danger icon={<CloseOutlined />} onClick={() => openRejectModal(row.id)}>拒绝</Button>
        </Space>
      )
    }
  ]

  const tabItems = [
    {
      key: 'records',
      label: <><HistoryOutlined /> 结算记录</>,
      children: (
        <Card>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <span>状态筛选：</span>
              <Select
                style={{ width: 140 }}
                placeholder="全部"
                allowClear
                value={allFilterStatus || undefined}
                onChange={(v) => setAllFilterStatus(v || '')}
              >
                <Option value="">全部</Option>
                <Option value="0">待审核</Option>
                <Option value="1">已完成</Option>
                <Option value="2">处理中</Option>
                <Option value="3">已拒绝</Option>
              </Select>
            </Space>
          </div>

          <Table
            columns={recordColumns}
            dataSource={allRecords}
            loading={allRecordsLoading}
            rowKey="id"
            size="small"
            scroll={{ x: 'max-content' }}
            style={{ width: '100%' }}
            pagination={{
              current: allRecordsPage,
              total: allRecordsTotal,
              pageSize: 20,
              showTotal: (t) => `共 ${t} 条`,
              onChange: fetchAllRecords
            }}
          />
        </Card>
      )
    },
    {
      key: 'settings',
      label: <><SettingOutlined /> 结算设置</>,
      children: (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {/* 结算方式设置 */}
          <Card
            title="结算方式设置"
            extra={
              <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={saveOptions}>
                保存设置
              </Button>
            }
            loading={loading}
          >
            <Row gutter={[24, 16]}>
              <Col span={24}>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>启用的结算方式：</div>
                <Space size={24}>
                  <Checkbox
                    checked={options.alipay_enabled}
                    onChange={(e) => setOptions({ ...options, alipay_enabled: e.target.checked })}
                  >
                    <Tag color="blue">支付宝</Tag>
                  </Checkbox>
                  <Checkbox
                    checked={options.wxpay_enabled}
                    onChange={(e) => setOptions({ ...options, wxpay_enabled: e.target.checked })}
                  >
                    <Tag color="green">微信</Tag>
                  </Checkbox>
                  <Checkbox
                    checked={options.bank_enabled}
                    onChange={(e) => setOptions({ ...options, bank_enabled: e.target.checked })}
                  >
                    <Tag color="orange">银行卡</Tag>
                  </Checkbox>
                  <Checkbox
                    checked={options.crypto_enabled}
                    onChange={(e) => setOptions({ ...options, crypto_enabled: e.target.checked })}
                  >
                    <Tag color="purple">加密货币</Tag>
                  </Checkbox>
                </Space>
              </Col>

              {options.crypto_enabled && (
                <Col span={24}>
                  <div style={{ marginBottom: 8, fontWeight: 500 }}>支持的加密货币网络：</div>
                  <Checkbox.Group
                    options={CRYPTO_NETWORKS}
                    value={options.crypto_networks}
                    onChange={(values) => setOptions({ ...options, crypto_networks: values })}
                  />
                </Col>
              )}
            </Row>
          </Card>

          {/* 手续费与周期 */}
          <Card title="手续费与周期设置">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={4}>
                <div style={{ marginBottom: 4, fontSize: 12 }}>手续费率 (%)：</div>
                <InputNumber
                  style={{ width: '100%' }}
                  value={options.settle_rate}
                  onChange={(v) => setOptions({ ...options, settle_rate: v || 0 })}
                  min={0}
                  max={100}
                  precision={2}
                  placeholder="如 0.5"
                />
              </Col>
              <Col xs={12} sm={6} md={3}>
                <div style={{ marginBottom: 4, fontSize: 12 }}>最低手续费(元)：</div>
                <InputNumber
                  style={{ width: '100%' }}
                  value={options.settle_fee_min}
                  onChange={(v) => setOptions({ ...options, settle_fee_min: v || 0 })}
                  min={0}
                  precision={2}
                  placeholder="0=不限"
                />
              </Col>
              <Col xs={12} sm={6} md={3}>
                <div style={{ marginBottom: 4, fontSize: 12 }}>最高手续费(元)：</div>
                <InputNumber
                  style={{ width: '100%' }}
                  value={options.settle_fee_max}
                  onChange={(v) => setOptions({ ...options, settle_fee_max: v || 0 })}
                  min={0}
                  precision={2}
                  placeholder="0=不限"
                />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <div style={{ marginBottom: 4, fontSize: 12 }}>最低提现金额(元)：</div>
                <InputNumber
                  style={{ width: '100%' }}
                  value={options.min_settle_amount}
                  onChange={(v) => setOptions({ ...options, min_settle_amount: v || 10 })}
                  min={0}
                  precision={2}
                />
              </Col>
              <Col xs={24} sm={16} md={10}>
                <div style={{ marginBottom: 4, fontSize: 12 }}>商户手动提现结算周期：</div>
                <Select
                  style={{ width: '100%' }}
                  value={options.settle_cycle}
                  onChange={(v) => setOptions({ ...options, settle_cycle: v })}
                >
                  <Option value={-1}>实时（收入即可提现）</Option>
                  <Option value={0}>D+0（过了0点，前一天可全部提现）</Option>
                  <Option value={1}>D+1（第二天过了0点才能提现）</Option>
                </Select>
              </Col>
            </Row>
          </Card>

          {/* 自动结算设置 */}
          <Card
            title="自动结算设置"
            extra={canManualBatchSettle ? (
              <Popconfirm
                title="确认立即执行手动批量结算？"
                description="会按当前自动结算配置，立即为满足条件的商户生成结算单。"
                onConfirm={triggerManualBatchSettle}
                okText="立即执行"
                cancelText="取消"
              >
                <Button type="primary" loading={manualSettling}>
                  手动批量结算
                </Button>
              </Popconfirm>
            ) : null}
          >
            <Row gutter={[24, 16]}>
              <Col xs={24} md={6}>
                <Checkbox
                  checked={options.auto_settle}
                  onChange={(e) => setOptions({ ...options, auto_settle: e.target.checked })}
                >
                  启用自动结算
                </Checkbox>
                <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                  启用后，系统会根据规则自动生成结算单
                </div>
              </Col>

              {options.auto_settle && (
                <>
                  <Col xs={24} md={6}>
                    <div style={{ marginBottom: 8 }}>自动结算周期：</div>
                    <Select
                      style={{ width: '100%' }}
                      value={options.auto_settle_cycle}
                      onChange={(v) => setOptions({ ...options, auto_settle_cycle: v })}
                    >
                      <Option value={-1}>实时（有收入立即生成结算单）</Option>
                      <Option value={0}>D+0（每天0点结算前一天）</Option>
                      <Option value={1}>D+1（每天0点结算前两天及之前）</Option>
                    </Select>
                    <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                      {options.auto_settle_cycle === -1 && '订单支付成功后立即生成结算单'}
                      {options.auto_settle_cycle === 0 && '每天凌晨自动结算昨天及之前可用余额'}
                      {options.auto_settle_cycle === 1 && '每天凌晨自动结算前天及之前可用余额'}
                    </div>
                  </Col>
                  <Col xs={24} md={6}>
                    <div style={{ marginBottom: 8 }}>自动结算金额阈值(元)：</div>
                    <InputNumber
                      style={{ width: '100%' }}
                      value={options.auto_settle_amount}
                      onChange={(v) => setOptions({ ...options, auto_settle_amount: v || 0 })}
                      min={0}
                      precision={2}
                      placeholder="0 表示不限制"
                    />
                    <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                      {options.auto_settle_amount > 0
                        ? `可结算金额 ≥ ¥${options.auto_settle_amount} 时自动生成结算单`
                        : '不限制金额，只要满足周期条件即自动结算'}
                    </div>
                  </Col>
                  <Col xs={24} md={6}>
                    <div style={{ marginBottom: 8 }}>强制结算方式：</div>
                    <Select
                      style={{ width: '100%' }}
                      value={options.auto_settle_type}
                      onChange={(v) => setOptions({ ...options, auto_settle_type: v })}
                      allowClear
                      placeholder="使用商户默认"
                    >
                      <Option value="">使用商户默认方式</Option>
                      {options.alipay_enabled && <Option value="alipay">支付宝</Option>}
                      {options.wxpay_enabled && <Option value="wxpay">微信</Option>}
                      {options.bank_enabled && <Option value="bank">银行卡</Option>}
                      {options.crypto_enabled && <Option value="crypto">加密货币</Option>}
                    </Select>
                    <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                      强制使用指定结算方式，忽略商户设置的默认方式
                    </div>
                  </Col>
                </>
              )}
            </Row>
          </Card>

          {/* 商户结算信息 */}
          <Card title={<><WalletOutlined /> 商户结算账户</>}>
            <Table
              columns={merchantColumns}
              dataSource={merchants}
              loading={merchantsLoading}
              rowKey={(row) => row.merchant_id}
              pagination={{ pageSize: 20 }}
              bordered
              size="small"
            />
          </Card>
        </Space>
      )
    },
    {
      key: 'audit',
      label: (
        <Badge count={pendingCount} offset={[10, 0]}>
          <AuditOutlined /> 结算审核
        </Badge>
      ),
      children: (
        <Card>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Statistic
                title="待审核数量"
                value={pendingCount}
                suffix="条"
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="待审核金额"
                value={formatMoney(pendingAmount)}
                prefix="¥"
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col span={12} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              {selectedRowKeys.length > 0 && (
                <Popconfirm
                  title={`确定批量通过 ${selectedRowKeys.length} 条提现申请？`}
                  onConfirm={batchApprove}
                >
                  <Button type="primary">
                    批量通过 ({selectedRowKeys.length})
                  </Button>
                </Popconfirm>
              )}
            </Col>
          </Row>

          <Table
            columns={auditColumns}
            dataSource={withdrawRecords}
            loading={recordsLoading}
            rowKey="id"
            size="small"
            scroll={{ x: 'max-content' }}
            style={{ width: '100%' }}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              getCheckboxProps: (record) => ({
                disabled: record.status !== 0
              })
            }}
            pagination={{
              current: recordsPage,
              total: recordsTotal,
              pageSize: 20,
              showTotal: (t) => `共 ${t} 条`,
              onChange: fetchWithdrawRecords
            }}
          />
        </Card>
      )
    }
  ]

  return (
    <div>
      <h2 className="page-title">结算管理</h2>
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={tabItems}
      />
      
      {/* 拒绝原因弹窗 */}
      <Modal
        title="拒绝提现"
        open={rejectModalVisible}
        onCancel={() => setRejectModalVisible(false)}
        onOk={rejectWithdraw}
        okText="确定拒绝"
        okButtonProps={{ danger: true }}
      >
        <div style={{ marginBottom: 8 }}>请填写拒绝原因：</div>
        <Input.TextArea
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="请输入拒绝原因，将展示给商户"
        />
      </Modal>

      {/* 商户结算详情弹窗 */}
      <Modal
        title={`${detailMerchant?.username || detailMerchant?.merchant_id || ''} 的结算设置`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={
          <Space>
            <Button icon={<PlusOutlined />} type="primary" onClick={() => openEditSettleModal(null)}>
              新增结算方式
            </Button>
            <Button onClick={() => setDetailModalVisible(false)}>关闭</Button>
          </Space>
        }
        width={700}
        maskClosable={true}
      >
        {detailMerchant && (
          <div>
            {(detailMerchant.settlements || []).length === 0 ? (
              <Empty description="该商户暂未设置结算方式" />
            ) : (
              (detailMerchant.settlements || []).map((s, idx) => (
                <Card 
                  key={idx} 
                  size="small" 
                  style={{ marginBottom: 8 }}
                  extra={
                    <Space>
                      <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditSettleModal(s)}>编辑</Button>
                      <Popconfirm title="确定删除此结算方式？" onConfirm={() => deleteSettleMethod(s)}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                      </Popconfirm>
                    </Space>
                  }
                >
                  <Descriptions size="small" column={2}>
                    <Descriptions.Item label="结算方式">
                      <Tag color={getSettleTypeColor(s.settle_type)}>
                        {getSettleTypeName(s.settle_type)}
                        {s.is_default === 1 && <span style={{ marginLeft: 4 }}>(默认)</span>}
                      </Tag>
                    </Descriptions.Item>
                    {s.settle_type === 'alipay' && (
                      <>
                        <Descriptions.Item label="账户名">{s.account_name || '-'}</Descriptions.Item>
                        <Descriptions.Item label="支付宝账号">{s.account_no || '-'}</Descriptions.Item>
                      </>
                    )}
                    {s.settle_type === 'wxpay' && (
                      <>
                        <Descriptions.Item label="姓名">{s.account_name || '-'}</Descriptions.Item>
                        <Descriptions.Item label="微信号">{s.account_no || '-'}</Descriptions.Item>
                      </>
                    )}
                    {s.settle_type === 'bank' && (
                      <>
                        <Descriptions.Item label="开户名">{s.account_name || '-'}</Descriptions.Item>
                        <Descriptions.Item label="银行卡号">{s.account_no || '-'}</Descriptions.Item>
                        <Descriptions.Item label="开户银行">{s.bank_name || '-'}</Descriptions.Item>
                      </>
                    )}
                    {s.settle_type === 'crypto' && (
                      <>
                        <Descriptions.Item label="网络">{s.crypto_network || '-'}</Descriptions.Item>
                        <Descriptions.Item label="地址" span={2}>
                          <Space size={8} align="start" style={{ maxWidth: '100%' }}>
                            <span style={{ wordBreak: shouldMaskCryptoAddress ? 'normal' : 'break-all', fontSize: 12 }}>
                              {formatCryptoAddress(s.crypto_address)}
                            </span>
                            {s.crypto_address ? (
                              <Button
                                type="link"
                                size="small"
                                icon={<CopyOutlined />}
                                style={{ padding: 0, height: 'auto' }}
                                aria-label="复制地址"
                                onClick={() => copyToClipboard(s.crypto_address)}
                              />
                            ) : null}
                          </Space>
                        </Descriptions.Item>
                      </>
                    )}
                  </Descriptions>
                </Card>
              ))
            )}
          </div>
        )}
      </Modal>

      {/* 编辑商户结算方式弹窗 */}
      <Modal
        title={editingSettle ? '编辑结算方式' : '新增结算方式'}
        open={editSettleModalVisible}
        onCancel={() => setEditSettleModalVisible(false)}
        onOk={saveSettleMethod}
        confirmLoading={editSettleSaving}
        width={500}
      >
        <Form form={editSettleForm} layout="vertical">
          <Form.Item name="settle_type" label="结算方式" rules={[{ required: true, message: '请选择结算方式' }]}>
            <Select placeholder="请选择结算方式" disabled={!!editingSettle}>
              {options.alipay_enabled && <Option value="alipay">支付宝</Option>}
              {options.wxpay_enabled && <Option value="wxpay">微信</Option>}
              {options.bank_enabled && <Option value="bank">银行卡</Option>}
              {options.crypto_enabled && (options.crypto_networks?.length > 0) && <Option value="crypto">加密货币</Option>}
            </Select>
          </Form.Item>
          
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.settle_type !== cur.settle_type}>
            {({ getFieldValue }) => {
              const settleType = getFieldValue('settle_type')
              
              if (settleType === 'alipay') {
                return (
                  <>
                    <Form.Item name="account_name" label="账户名" rules={[{ required: true }]}>
                      <Input placeholder="支付宝实名姓名" />
                    </Form.Item>
                    <Form.Item name="account_no" label="支付宝账号" rules={[{ required: true }]}>
                      <Input placeholder="手机号或邮箱" />
                    </Form.Item>
                  </>
                )
              }
              
              if (settleType === 'wxpay') {
                return (
                  <>
                    <Form.Item name="account_name" label="姓名" rules={[{ required: true }]}>
                      <Input placeholder="微信实名姓名" />
                    </Form.Item>
                    <Form.Item name="account_no" label="微信号" rules={[{ required: true }]}>
                      <Input placeholder="微信号" />
                    </Form.Item>
                  </>
                )
              }
              
              if (settleType === 'bank') {
                return (
                  <>
                    <Form.Item name="account_name" label="开户名" rules={[{ required: true }]}>
                      <Input placeholder="银行卡开户名" />
                    </Form.Item>
                    <Form.Item name="account_no" label="银行卡号" rules={[{ required: true }]}>
                      <Input placeholder="银行卡号" />
                    </Form.Item>
                    <Form.Item name="bank_name" label="开户银行" rules={[{ required: true }]}>
                      <Input placeholder="如：中国工商银行" />
                    </Form.Item>
                    <Form.Item name="bank_branch" label="开户支行">
                      <Input placeholder="选填，如：北京朝阳支行" />
                    </Form.Item>
                  </>
                )
              }
              
              if (settleType === 'crypto') {
                return (
                  <>
                    <Form.Item name="crypto_network" label="网络" rules={[{ required: true }]}>
                      <Select placeholder="选择网络">
                        {(options.crypto_networks || []).map(network => {
                          const networkInfo = CRYPTO_NETWORKS.find(n => n.value === network)
                          return networkInfo ? (
                            <Option key={network} value={network}>{networkInfo.label}</Option>
                          ) : (
                            <Option key={network} value={network}>{network}</Option>
                          )
                        })}
                      </Select>
                    </Form.Item>
                    <Form.Item name="crypto_address" label="钱包地址" rules={[{ required: true }]}>
                      <Input.TextArea rows={2} placeholder="钱包地址" />
                    </Form.Item>
                  </>
                )
              }
              
              return null
            }}
          </Form.Item>
          
          <Form.Item name="is_default" valuePropName="checked">
            <Checkbox>设为默认结算方式</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Settlements

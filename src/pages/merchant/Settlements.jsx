import { useState, useEffect } from 'react'
import { Card, Table, Tag, Button, message, Space, Modal, Form, Input, Select, Row, Col, Descriptions, Statistic, Alert, Typography } from 'antd'
import { PlusOutlined, DeleteOutlined, StarOutlined, StarFilled, MoneyCollectOutlined, HistoryOutlined, EditOutlined } from '@ant-design/icons'
import api from '../../utils/api'

const { Option } = Select
const { Text } = Typography

// 加密货币网络选项
const CRYPTO_NETWORKS = [
  { label: 'TRC20 (TRON)', value: 'TRC20' },
  { label: 'ERC20 (Ethereum)', value: 'ERC20' },
  { label: 'BEP20 (BSC)', value: 'BEP20' },
  { label: 'Polygon', value: 'POLYGON' },
  { label: 'Solana', value: 'SOL' },
]

function Settlements() {
  const [loading, setLoading] = useState(false)
  const [balance, setBalance] = useState(0)
  const [providerOptions, setProviderOptions] = useState(null)
  const [settlements, setSettlements] = useState([])
  
  // 添加/编辑账户弹窗
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [editingSettlement, setEditingSettlement] = useState(null) // 编辑时的数据
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  
  // 提现弹窗
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false)
  const [withdrawForm] = Form.useForm()
  const [withdrawing, setWithdrawing] = useState(false)
  
  // 结算记录
  const [records, setRecords] = useState([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [recordsTotal, setRecordsTotal] = useState(0)
  const [recordsPage, setRecordsPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')

  const formatMoney = (v) => parseFloat(v || 0).toFixed(2)

  // 获取余额和结算设置
  const fetchData = async () => {
    setLoading(true)
    try {
      // 获取余额
      const profileRes = await api.get('/api/merchant/profile')
      if (profileRes.data.code === 0) {
        setBalance(profileRes.data.data.balance || 0)
      }
      
      // 获取支持的结算方式
      const optRes = await api.get('/api/merchant/settlement/options')
      if (optRes.data.code === 0) {
        setProviderOptions(optRes.data.data)
      }
      
      // 获取已设置的结算方式
      const setRes = await api.get('/api/merchant/settlement/settings')
      if (setRes.data.code === 0) {
        setSettlements(setRes.data.data)
      }
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 获取结算记录
  const fetchRecords = async (page = 1) => {
    setRecordsLoading(true)
    try {
      const params = { page, pageSize: 20, status: filterStatus }
      const res = await api.get('/api/merchant/withdraw/records', { params })
      if (res.data.code === 0) {
        setRecords(res.data.data.records || [])
        setRecordsTotal(res.data.data.total || 0)
        setRecordsPage(page)
      }
    } catch (error) {
      console.error('获取结算记录失败:', error)
    } finally {
      setRecordsLoading(false)
    }
  }

  // 打开添加弹窗
  const openAddModal = () => {
    setEditingSettlement(null)
    form.resetFields()
    setAddModalVisible(true)
  }
  
  // 打开编辑弹窗
  const openEditModal = (settlement) => {
    setEditingSettlement(settlement)
    // 填充表单数据
    const formData = {
      type: settlement.settle_type,
      is_default: settlement.is_default === 1
    }
    if (settlement.settle_type === 'crypto') {
      formData.network = settlement.crypto_network
      formData.account = settlement.crypto_address
    } else if (settlement.settle_type === 'bank') {
      formData.name = settlement.account_name
      formData.account = settlement.account_no
      formData.bank_name = settlement.bank_name
    } else {
      formData.name = settlement.account_name
      formData.account = settlement.account_no
    }
    form.setFieldsValue(formData)
    setAddModalVisible(true)
  }

  // 添加/编辑结算账户
  const handleSaveAccount = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      
      // 转换字段名适配后端接口
      const payload = {
        settle_type: values.type,
        is_default: values.is_default ? 1 : 0
      }
      
      if (values.type === 'crypto') {
        payload.crypto_network = values.network
        payload.crypto_address = values.account
      } else if (values.type === 'bank') {
        payload.account_name = values.name
        payload.account_no = values.account
        payload.bank_name = values.bank_name
      } else {
        // alipay / wxpay
        payload.account_name = values.name
        payload.account_no = values.account
      }
      
      const res = await api.post('/api/merchant/settlement/save', payload)
      if (res.data.code === 0) {
        message.success(editingSettlement ? '修改成功' : '添加成功')
        setAddModalVisible(false)
        setEditingSettlement(null)
        form.resetFields()
        fetchData()
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      if (error.errorFields) return
      message.error(editingSettlement ? '修改失败' : '添加失败')
    } finally {
      setSaving(false)
    }
  }

  // 删除结算账户
  const handleDelete = async (id) => {
    try {
      const res = await api.post('/api/merchant/settlement/delete', { id })
      if (res.data.code === 0) {
        message.success('删除成功')
        fetchData()
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 设为默认
  const handleSetDefault = async (id) => {
    try {
      const res = await api.post('/api/merchant/settlement/set-default', { id })
      if (res.data.code === 0) {
        message.success('设置成功')
        fetchData()
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('设置失败')
    }
  }

  // 提现
  const openWithdrawModal = () => {
    withdrawForm.resetFields()
    withdrawForm.setFieldValue('amount', balance)
    setWithdrawModalVisible(true)
  }

  const handleWithdraw = async () => {
    try {
      const values = await withdrawForm.validateFields()
      setWithdrawing(true)
      const res = await api.post('/api/merchant/withdraw/apply', values)
      if (res.data.code === 0) {
        message.success('提现申请已提交')
        setWithdrawModalVisible(false)
        fetchData()
        fetchRecords()
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      if (error.errorFields) return
      message.error('提现失败')
    } finally {
      setWithdrawing(false)
    }
  }

  useEffect(() => {
    fetchData()
    fetchRecords()
  }, [])

  useEffect(() => {
    fetchRecords(1)
  }, [filterStatus])

  const settlementColumns = [
    { title: '类型', dataIndex: 'settle_type', width: 100, render: (v) => ({
      alipay: '支付宝',
      wxpay: '微信',
      bank: '银行卡',
      crypto: 'USDT'
    }[v] || v) },
    { title: '账户', width: 200, ellipsis: true, render: (_, row) => {
      if (row.settle_type === 'crypto') {
        return <span>{row.crypto_network}: {row.crypto_address}</span>
      }
      return row.account_no || '-'
    }},
    { title: '姓名/银行', width: 150, render: (_, row) => {
      if (row.settle_type === 'bank') {
        return <span>{row.account_name} ({row.bank_name})</span>
      }
      if (row.settle_type === 'crypto') {
        return '-'
      }
      return row.account_name || '-'
    }},
    { title: '默认', dataIndex: 'is_default', width: 80, align: 'center', render: (v) => v ? <StarFilled style={{ color: '#faad14' }} /> : '-' },
    {
      title: '操作',
      width: 200,
      render: (_, row) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(row)}>编辑</Button>
          {!row.is_default && (
            <Button type="link" size="small" onClick={() => handleSetDefault(row.id)}>设为默认</Button>
          )}
          <Button type="link" size="small" danger onClick={() => handleDelete(row.id)}>删除</Button>
        </Space>
      )
    }
  ]

  const formatTime = (t) => {
    if (!t) return '-'
    return new Date(t).toLocaleString('zh-CN')
  }

  const recordColumns = [
    { title: '申请时间', dataIndex: 'created_at', width: 160, render: (v) => formatTime(v) },
    { title: '金额', dataIndex: 'amount', width: 100, render: (v) => `¥${formatMoney(v)}` },
    { title: '手续费', dataIndex: 'fee', width: 80, render: (v) => `¥${formatMoney(v)}` },
    { title: '实际到账', dataIndex: 'real_amount', width: 100, render: (v) => `¥${formatMoney(v)}` },
    { title: '方式', dataIndex: 'settle_type', width: 80, render: (v) => ({
      alipay: '支付宝',
      wxpay: '微信',
      bank: '银行卡',
      crypto: 'USDT'
    }[v] || v) },
    { title: '状态', dataIndex: 'status', width: 80, render: (v) => ({
      0: <Tag color="processing">处理中</Tag>,
      1: <Tag color="success">已完成</Tag>,
      3: <Tag color="error">已拒绝</Tag>
    }[v] || <Tag>未知</Tag>) },
    { title: '备注', dataIndex: 'remark', ellipsis: true }
  ]

  return (
    <div>
      <h2 className="page-title">结算管理</h2>

      {/* 余额卡片 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24} align="middle">
          <Col>
            <Statistic
              title="可提现余额"
              value={balance}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#1890ff', fontSize: 28 }}
            />
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<MoneyCollectOutlined />}
              onClick={openWithdrawModal}
              disabled={balance <= 0 || settlements.length === 0}
            >
              申请提现
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 结算账户 */}
      <Card
        title="结算账户"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openAddModal}
          >
            添加账户
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        {settlements.length === 0 ? (
          <Alert
            message="暂无结算账户"
            description="请先添加结算账户才能申请提现"
            type="info"
            showIcon
          />
        ) : (
          <Table
            columns={settlementColumns}
            dataSource={settlements}
            rowKey="id"
            pagination={false}
            size="small"
          />
        )}
      </Card>

      {/* 结算记录 */}
      <Card
        title="结算记录"
        extra={
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 120 }}
            allowClear
            placeholder="全部状态"
          >
            <Option value="0">处理中</Option>
            <Option value="1">已完成</Option>
            <Option value="3">已拒绝</Option>
          </Select>
        }
      >
        <Table
          columns={recordColumns}
          dataSource={records}
          rowKey="id"
          loading={recordsLoading}
          pagination={{
            current: recordsPage,
            total: recordsTotal,
            pageSize: 20,
            onChange: fetchRecords
          }}
          size="small"
        />
      </Card>

      {/* 添加/编辑账户弹窗 */}
      <Modal
        title={editingSettlement ? '编辑结算账户' : '添加结算账户'}
        open={addModalVisible}
        onCancel={() => { setAddModalVisible(false); setEditingSettlement(null); form.resetFields(); }}
        onOk={handleSaveAccount}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="结算方式"
            name="type"
            rules={[{ required: true, message: '请选择结算方式' }]}
          >
            <Select placeholder="请选择" disabled={!!editingSettlement}>
              {providerOptions?.alipay_enabled && <Option value="alipay">支付宝</Option>}
              {providerOptions?.wxpay_enabled && <Option value="wxpay">微信</Option>}
              {providerOptions?.bank_enabled && <Option value="bank">银行卡</Option>}
              {providerOptions?.crypto_enabled && (providerOptions?.crypto_networks?.length > 0) && <Option value="crypto">USDT</Option>}
            </Select>
          </Form.Item>
          
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
            {({ getFieldValue }) => {
              const type = getFieldValue('type')
              if (type === 'crypto') {
                return (
                  <>
                    <Form.Item
                      label="网络"
                      name="network"
                      rules={[{ required: true, message: '请选择网络' }]}
                    >
                      <Select placeholder="请选择网络">
                        {(providerOptions?.crypto_networks || []).map(n => (
                          <Option key={n} value={n}>{n}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item
                      label="钱包地址"
                      name="account"
                      rules={[{ required: true, message: '请输入钱包地址' }]}
                    >
                      <Input placeholder="请输入 USDT 钱包地址" />
                    </Form.Item>
                  </>
                )
              }
              if (type === 'bank') {
                return (
                  <>
                    <Form.Item
                      label="开户行"
                      name="bank_name"
                      rules={[{ required: true, message: '请输入开户行' }]}
                    >
                      <Input placeholder="如：中国工商银行" />
                    </Form.Item>
                    <Form.Item
                      label="银行卡号"
                      name="account"
                      rules={[{ required: true, message: '请输入银行卡号' }]}
                    >
                      <Input placeholder="请输入银行卡号" />
                    </Form.Item>
                    <Form.Item
                      label="持卡人姓名"
                      name="name"
                      rules={[{ required: true, message: '请输入姓名' }]}
                    >
                      <Input placeholder="请输入持卡人姓名" />
                    </Form.Item>
                  </>
                )
              }
              if (type === 'alipay' || type === 'wxpay') {
                return (
                  <>
                    <Form.Item
                      label="账号"
                      name="account"
                      rules={[{ required: true, message: '请输入账号' }]}
                    >
                      <Input placeholder={type === 'alipay' ? '支付宝账号' : '微信号'} />
                    </Form.Item>
                    <Form.Item
                      label="姓名"
                      name="name"
                      rules={[{ required: true, message: '请输入姓名' }]}
                    >
                      <Input placeholder="请输入真实姓名" />
                    </Form.Item>
                  </>
                )
              }
              return null
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* 提现弹窗 */}
      <Modal
        title="申请提现"
        open={withdrawModalVisible}
        onCancel={() => setWithdrawModalVisible(false)}
        onOk={handleWithdraw}
        confirmLoading={withdrawing}
      >
        <Alert
          message={`可提现余额：¥${formatMoney(balance)}`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={withdrawForm} layout="vertical">
          <Form.Item
            label="提现金额"
            name="amount"
            rules={[
              { required: true, message: '请输入提现金额' },
              { 
                validator: (_, value) => {
                  const num = parseFloat(value)
                  if (isNaN(num) || num < 0.01) {
                    return Promise.reject('最小提现金额 0.01')
                  }
                  if (num > balance) {
                    return Promise.reject('提现金额不能超过可提现余额')
                  }
                  return Promise.resolve()
                }
              }
            ]}
          >
            <Input type="number" prefix="¥" placeholder="请输入金额" step="0.01" />
          </Form.Item>
          <Form.Item
            label="结算账户"
            name="settlement_id"
            rules={[{ required: true, message: '请选择结算账户' }]}
          >
            <Select placeholder="请选择">
              {settlements.map(s => {
                const typeName = { alipay: '支付宝', wxpay: '微信', bank: '银行卡', crypto: 'USDT' }[s.settle_type] || s.settle_type
                const account = s.settle_type === 'crypto' 
                  ? `${s.crypto_network}: ${s.crypto_address?.slice(0, 10)}...`
                  : s.account_no
                return (
                  <Option key={s.id} value={s.id}>
                    {typeName} - {account} {s.is_default ? '(默认)' : ''}
                  </Option>
                )
              })}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Settlements

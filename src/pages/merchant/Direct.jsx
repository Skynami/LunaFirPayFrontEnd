import { useEffect, useMemo, useState } from 'react'
import { Card, Row, Col, Switch, Button, message, Input, Space, Form, InputNumber, Table, Tag, Modal, Typography, Segmented } from 'antd'
import { CopyOutlined, QrcodeOutlined, PlusOutlined } from '@ant-design/icons'
import api from '../../utils/api'

const { Text } = Typography

function formatTime(t) {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

function buildQrPreview(url) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url || '')}`
}

function isLinkExpired(row) {
  if (!row) return false
  if (row.is_expired === 1 || row.is_expired === true) return true
  if (!row.expires_at) return true
  const expiresAt = new Date(row.expires_at).getTime()
  if (!Number.isFinite(expiresAt)) return true
  return expiresAt <= Date.now()
}

function Direct() {
  const [loading, setLoading] = useState(false)
  const [cfgLoading, setCfgLoading] = useState(false)
  const [linksLoading, setLinksLoading] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [defaultUrl, setDefaultUrl] = useState('')
  const [defaultToken, setDefaultToken] = useState('')
  const [links, setLinks] = useState([])
  const [createForm] = Form.useForm()
  const [qrModal, setQrModal] = useState({ open: false, url: '', title: '' })
  const [resettingToken, setResettingToken] = useState(false)

  const defaultQrUrl = useMemo(() => buildQrPreview(defaultUrl), [defaultUrl])

  const fetchConfig = async () => {
    setCfgLoading(true)
    try {
      const res = await api.get('/api/merchant/direct/config')
      if (res.data.code === 0) {
        setEnabled(!!res.data.data.enabled)
        setDefaultUrl(res.data.data.defaultUrl || '')
        setDefaultToken(res.data.data.defaultToken || '')
      } else {
        message.error(res.data.msg || '获取配置失败')
      }
    } catch (error) {
      message.error('获取配置失败')
    } finally {
      setCfgLoading(false)
    }
  }

  const fetchLinks = async () => {
    setLinksLoading(true)
    try {
      const res = await api.get('/api/merchant/direct/links')
      if (res.data.code === 0) {
        setLinks(res.data.data || [])
      } else {
        message.error(res.data.msg || '获取列表失败')
      }
    } catch (error) {
      message.error('获取列表失败')
    } finally {
      setLinksLoading(false)
    }
  }

  const toggleDefault = async (checked) => {
    setLoading(true)
    try {
      const url = checked ? '/api/merchant/direct/enable' : '/api/merchant/direct/disable'
      const res = await api.post(url)
      if (res.data.code === 0) {
        message.success(res.data.msg || '操作成功')
        await fetchConfig()
      } else {
        message.error(res.data.msg || '操作失败')
      }
    } catch (error) {
      message.error('操作失败')
    } finally {
      setLoading(false)
    }
  }

  const createFixedLink = async () => {
    try {
      const values = await createForm.validateFields()
      setLoading(true)
      const res = await api.post('/api/merchant/direct/links', {
        amount: values.amount,
        expireHours: values.expireHours,
        usageMode: values.usageMode || 'single_use',
        reason: values.reason || ''
      })
      if (res.data.code === 0) {
        message.success('固定金额链接创建成功')
        createForm.resetFields()
        await fetchLinks()
      } else {
        message.error(res.data.msg || '创建失败')
      }
    } catch (error) {
      if (error && error.errorFields) return
      message.error('创建失败')
    } finally {
      setLoading(false)
    }
  }

  const setLinkEnabled = async (row, checked) => {
    try {
      const res = await api.post(`/api/merchant/direct/links/${row.id}/toggle`, {
        enabled: checked ? 1 : 0
      })
      if (res.data.code === 0) {
        message.success(checked ? '已启用' : '已停用')
        fetchLinks()
      } else {
        message.error(res.data.msg || '操作失败')
      }
    } catch (error) {
      message.error('操作失败')
    }
  }

  const resetDefaultLinkToken = async () => {
    setResettingToken(true)
    try {
      const res = await api.post('/api/merchant/direct/reset-token')
      if (res.data.code === 0) {
        message.success(res.data.msg || '收款链接已更换')
        await fetchConfig()
      } else {
        message.error(res.data.msg || '更换失败')
      }
    } catch (error) {
      message.error('更换失败')
    } finally {
      setResettingToken(false)
    }
  }

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      message.success('已复制链接')
    } catch (error) {
      message.error('复制失败，请手动复制')
    }
  }

  const columns = [
    {
      title: 'Token',
      dataIndex: 'token',
      width: 220,
      render: (v) => <Text code>{v}</Text>
    },
    {
      title: '金额',
      dataIndex: 'fixed_amount',
      width: 120,
      render: (v) => `¥${Number(v || 0).toFixed(2)}`
    },
    {
      title: '策略',
      dataIndex: 'usage_mode',
      width: 100,
      render: (v) => (v === 'multi_use' ? <Tag color="blue">长期</Tag> : <Tag>一次性</Tag>)
    },
    {
      title: '有效期',
      dataIndex: 'expire_hours',
      width: 120,
      render: (v) => `${v} 小时`
    },
    {
      title: '到期时间',
      dataIndex: 'expires_at',
      width: 180,
      render: (v) => formatTime(v)
    },
    {
      title: '状态',
      dataIndex: 'is_enabled',
      width: 120,
      render: (v, row) => {
        if ((row.usage_mode || 'single_use') === 'single_use' && Number(row.is_paid) === 1) return <Tag color="success">已完成</Tag>
        if (isLinkExpired(row)) return <Tag color="red">超时</Tag>
        return v === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>
      }
    },
    {
      title: '操作',
      width: 220,
      render: (_, row) => (
        <Space size={8} wrap>
          <Button size="small" icon={<CopyOutlined />} onClick={() => copyText(row.url)}>复制</Button>
          <Button size="small" icon={<QrcodeOutlined />} onClick={() => setQrModal({ open: true, url: row.url, title: '固定金额链接二维码' })}>二维码</Button>
          {Number(row.is_paid) === 1 && row.success_url ? (
            <Button size="small" type="link" onClick={() => window.open(row.success_url, '_blank')}>成功页</Button>
          ) : null}
          {!isLinkExpired(row) && Number(row.is_paid) !== 1 ? (
            <Switch size="small" checked={row.is_enabled === 1} onChange={(checked) => setLinkEnabled(row, checked)} />
          ) : null}
        </Space>
      )
    }
  ]

  useEffect(() => {
    fetchConfig()
    fetchLinks()
  }, [])

  return (
    <div>
      <h2 className="page-title">直接收款</h2>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="默认收款链接" loading={cfgLoading}>
            <Space direction="vertical" style={{ width: '100%' }} size={14}>
              <Space>
                <span>启用状态：</span>
                <Switch checked={enabled} loading={loading} onChange={toggleDefault} />
                <Tag color={enabled ? 'green' : 'default'}>{enabled ? '已启用' : '未启用'}</Tag>
              </Space>

              <div>
                <div style={{ marginBottom: 6 }}>收款链接</div>
                <Input value={defaultUrl || '未启用时暂无链接'} readOnly />
              </div>

              <Space wrap>
                <Button icon={<CopyOutlined />} disabled={!defaultUrl} onClick={() => copyText(defaultUrl)}>复制链接</Button>
                <Button icon={<QrcodeOutlined />} disabled={!defaultUrl} onClick={() => setQrModal({ open: true, url: defaultUrl, title: '默认收款二维码' })}>查看二维码</Button>
                <Button loading={resettingToken} onClick={resetDefaultLinkToken}>更换链接</Button>
              </Space>

              {defaultToken ? <Text type="secondary">Token: {defaultToken}</Text> : null}
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="创建固定金额链接">
            <Form form={createForm} layout="vertical" initialValues={{ expireHours: 24, usageMode: 'single_use' }}>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item
                    label="固定金额"
                    name="amount"
                    rules={[{ required: true, message: '请输入固定金额' }]}
                  >
                    <InputNumber min={0.01} step={0.01} precision={2} style={{ width: '100%' }} addonBefore="¥" placeholder="请输入金额" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="有效期（小时）"
                    name="expireHours"
                    rules={[{ required: true, message: '请输入有效期小时' }]}
                  >
                    <InputNumber min={1} max={720} precision={0} style={{ width: '100%' }} placeholder="1-720" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="有效策略" name="usageMode" rules={[{ required: true, message: '请选择有效策略' }]}>
                    <Segmented
                      block
                      options={[
                        { label: '一次性有效', value: 'single_use' },
                        { label: '长期有效', value: 'multi_use' }
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="理由（可选）"
                name="reason"
                rules={[{ max: 255, message: '理由最多255个字符' }]}
              >
                <Input.TextArea rows={3} placeholder="例如：会员充值、活动报名、补差价等（可不填）" />
              </Form.Item>

              <Button type="primary" icon={<PlusOutlined />} loading={loading} onClick={createFixedLink} block>
                生成固定金额链接
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>

      <Card title="固定金额链接列表" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          loading={linksLoading}
          columns={columns}
          dataSource={links}
          scroll={{ x: 980 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={qrModal.title}
        open={qrModal.open}
        onCancel={() => setQrModal({ open: false, url: '', title: '' })}
        footer={null}
      >
        <div style={{ textAlign: 'center' }}>
          <img src={buildQrPreview(qrModal.url)} alt="二维码" style={{ width: 260, maxWidth: '100%' }} />
          <div style={{ marginTop: 12, wordBreak: 'break-all' }}>{qrModal.url}</div>
        </div>
      </Modal>
    </div>
  )
}

export default Direct

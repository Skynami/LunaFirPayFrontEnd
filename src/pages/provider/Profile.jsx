import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Form, Input, InputNumber, Button, Switch, Descriptions, message, Alert, Modal, Tag, Select } from 'antd'
import { SendOutlined, LinkOutlined, DisconnectOutlined, CheckCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { useUserStore } from '../../stores/userStore'
import api from '../../utils/api'
import { formatTime } from '../../utils/time'

function Profile() {
  const navigate = useNavigate()
  const logout = useUserStore((state) => state.logout)
  const { isRam, ramInfo } = useUserStore()
  
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState(null)
  const [profile, setProfile] = useState({
    username: '',
    name: '',
    contact: '',
    api_endpoint: '',
    site_name: '',
    created_at: ''
  })
  const [stats, setStats] = useState({})
  const [saveLoading, setSaveLoading] = useState(false)

  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordForm] = Form.useForm()

  const [notifySettings, setNotifySettings] = useState({
    emailNotify: false,
    email: '',
    largeOrderNotify: false,
    largeOrderThreshold: 1000
  })
  const [notifyLoading, setNotifyLoading] = useState(false)

  // API节点表单
  const [apiEndpoint, setApiEndpoint] = useState('')
  const [apiSaveLoading, setApiSaveLoading] = useState(false)

  // 系统默认API端点
  const [defaultApiEndpoint, setDefaultApiEndpoint] = useState('')

  // 支付设置
  const [paymentConfig, setPaymentConfig] = useState({
    order_name_template: '',
    page_order_name: '0',
    notify_order_name: '0',
    user_refund: '0',
    auto_approve_merchant: '0',
    domain_whitelist_enabled: '0'
  })
  const [paymentConfigLoading, setPaymentConfigLoading] = useState(false)

  // 测试支付设置（独立栏目）
  const [testPayConfig, setTestPayConfig] = useState({
    test_pay_enabled: '0',
    test_pay_group_id: '',
    test_pay_max_amount: '50000',
    test_pay_auto_refund: '0'
  })
  const [testPayConfigLoading, setTestPayConfigLoading] = useState(false)

  const [payGroups, setPayGroups] = useState([])
  const [payGroupsLoading, setPayGroupsLoading] = useState(false)

  // Telegram 相关状态
  const [telegramStatus, setTelegramStatus] = useState({ bound: false })
  const [telegramLoading, setTelegramLoading] = useState(false)
  const [bindModal, setBindModal] = useState(false)
  const [bindUrl, setBindUrl] = useState('')
  const [bindCommand, setBindCommand] = useState('')
  const [botName, setBotName] = useState('')
  const [bindLoading, setBindLoading] = useState(false)

  const formatMoney = (value) => parseFloat(value || 0).toFixed(2)

  const copyToClipboard = (text, label = '') => {
    navigator.clipboard.writeText(text)
    message.success(`${label || '内容'}已复制到剪贴板`)
  }

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/admin/profile')
      if (res.data.code === 0) {
        setProfileData(res.data.data)
        if (res.data.data.profile) {
          setProfile(res.data.data.profile)
          setApiEndpoint(res.data.data.profile.api_endpoint || '')
        }
        if (res.data.data.stats) {
          setStats(res.data.data.stats)
        }
        if (res.data.data.notifySettings) {
          setNotifySettings(res.data.data.notifySettings)
        }
      }
    } catch (error) {
      message.error('获取个人资料失败')
    } finally {
      setLoading(false)
    }
  }

  // 获取系统默认API端点
  const fetchDefaultEndpoint = async () => {
    try {
      const res = await api.get('/api/system/config')
      if (res.data.code === 0) {
        setDefaultApiEndpoint(res.data.data.defaultApiEndpoint || '')
      }
    } catch (error) {
      console.error('获取系统配置失败:', error)
    }
  }

  // 获取支付设置
  const fetchPaymentConfig = async () => {
    try {
      const res = await api.get('/api/admin/system/config')
      if (res.data.code === 0) {
        setPaymentConfig({
          order_name_template: res.data.data.order_name_template || '',
          page_order_name: res.data.data.page_order_name || '0',
          notify_order_name: res.data.data.notify_order_name || '0',
          user_refund: res.data.data.user_refund || '0',
          auto_approve_merchant: res.data.data.auto_approve_merchant || '0',
          domain_whitelist_enabled: res.data.data.domain_whitelist_enabled || '0'
        })

        setTestPayConfig({
          test_pay_enabled: res.data.data.test_pay_enabled || '0',
          test_pay_group_id: res.data.data.test_pay_group_id ? String(res.data.data.test_pay_group_id) : '',
          test_pay_max_amount: res.data.data.test_pay_max_amount ? String(res.data.data.test_pay_max_amount) : '50000',
          test_pay_auto_refund: res.data.data.test_pay_auto_refund || '0'
        })
      }
    } catch (error) {
      console.error('获取支付设置失败:', error)
    }
  }

  const fetchPayGroups = async () => {
    try {
      setPayGroupsLoading(true)
      const res = await api.get('/api/admin/pay/pay-groups')
      if (res.data.code === 0) {
        setPayGroups(res.data.data || [])
      }
    } catch (error) {
      console.error('获取支付组失败:', error)
    } finally {
      setPayGroupsLoading(false)
    }
  }

  // 保存支付设置
  const savePaymentConfig = async () => {
    setPaymentConfigLoading(true)
    try {
      const res = await api.post('/api/admin/system/config', paymentConfig)
      if (res.data.code === 0) {
        message.success('支付设置保存成功')
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('保存失败')
    } finally {
      setPaymentConfigLoading(false)
    }
  }

  // 保存测试支付设置
  const saveTestPayConfig = async () => {
    if (testPayConfig.test_pay_enabled === '1' && !testPayConfig.test_pay_group_id) {
      message.error('开启测试支付时请选择支付组')
      return
    }

    const maxAmount = parseFloat(testPayConfig.test_pay_max_amount)
    if (isNaN(maxAmount) || maxAmount <= 0) {
      message.error('测试支付最大金额必须大于 0')
      return
    }

    setTestPayConfigLoading(true)
    try {
      const payload = {
        ...testPayConfig,
        test_pay_max_amount: maxAmount.toFixed(2)
      }
      const res = await api.post('/api/admin/system/config', payload)
      if (res.data.code === 0) {
        message.success('测试支付设置保存成功')
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('保存失败')
    } finally {
      setTestPayConfigLoading(false)
    }
  }

  // 通道自动关闭配置
  const [channelAutoClose, setChannelAutoClose] = useState({
    keywords: '',
    noticeEnabled: false
  })
  const [channelAutoCloseLoading, setChannelAutoCloseLoading] = useState(false)

  // 获取通道自动关闭配置
  const fetchChannelAutoClose = async () => {
    try {
      const res = await api.get('/api/admin/channel-auto-close/config')
      if (res.data.code === 0) {
        setChannelAutoClose(res.data.data)
      }
    } catch (error) {
      console.error('获取通道自动关闭配置失败:', error)
    }
  }

  // 保存通道自动关闭配置
  const saveChannelAutoClose = async () => {
    setChannelAutoCloseLoading(true)
    try {
      const res = await api.post('/api/admin/channel-auto-close/config', channelAutoClose)
      if (res.data.code === 0) {
        message.success('配置保存成功')
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('保存失败')
    } finally {
      setChannelAutoCloseLoading(false)
    }
  }

  // 获取 Telegram 绑定状态
  const fetchTelegramStatus = async () => {
    try {
      const res = await api.get('/api/admin/telegram/status')
      if (res.data.code === 0) {
        setTelegramStatus(res.data.data)
      }
    } catch (error) {
      console.error('获取 Telegram 状态失败:', error)
    }
  }

  // 生成绑定链接
  const generateBindLink = async () => {
    setBindLoading(true)
    try {
      const res = await api.post('/api/admin/telegram/bindToken')
      if (res.data.code === 0) {
        setBindUrl(res.data.data.bindUrl)
        setBindCommand(res.data.data.bindCommand || `/bind ${res.data.data.token}`)
        setBotName(res.data.data.botName || '')
        setBindModal(true)
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('生成绑定链接失败')
    } finally {
      setBindLoading(false)
    }
  }

  // 解除绑定
  const unbindTelegram = async () => {
    Modal.confirm({
      title: '确认解绑',
      content: '解绑后将无法接收 Telegram 通知，确定要解绑吗？',
      onOk: async () => {
        setTelegramLoading(true)
        try {
          const res = await api.post('/api/admin/telegram/unbind')
          if (res.data.code === 0) {
            message.success('解绑成功')
            setTelegramStatus({ bound: false })
          } else {
            message.error(res.data.msg)
          }
        } catch (error) {
          message.error('解绑失败')
        } finally {
          setTelegramLoading(false)
        }
      }
    })
  }

  // 发送测试消息
  const sendTestMessage = async () => {
    setTelegramLoading(true)
    try {
      const res = await api.post('/api/admin/telegram/test')
      if (res.data.code === 0) {
        message.success('测试消息已发送，请检查您的 Telegram')
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('发送失败')
    } finally {
      setTelegramLoading(false)
    }
  }

  const saveProfile = async () => {
    setSaveLoading(true)
    try {
      const res = await api.post('/api/admin/profile/update', {
        name: profile.name,
        contact: profile.contact,
        api_endpoint: profile.api_endpoint,
        site_name: profile.site_name
      })
      if (res.data.code === 0) {
        message.success('保存成功')
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('保存失败')
    } finally {
      setSaveLoading(false)
    }
  }

  // RAM 用户保存 API 节点
  const saveApiEndpoint = async () => {
    setApiSaveLoading(true)
    try {
      const res = await api.post('/api/admin/profile/update', {
        api_endpoint: apiEndpoint
      })
      if (res.data.code === 0) {
        message.success('API节点保存成功')
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('保存失败')
    } finally {
      setApiSaveLoading(false)
    }
  }

  const changePassword = async () => {
    try {
      const values = await passwordForm.validateFields()
      if (values.newPassword !== values.confirmPassword) {
        message.error('两次输入的密码不一致')
        return
      }

      setPasswordLoading(true)
      const res = await api.post('/api/auth/change-password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword
      })
      if (res.data.code === 0) {
        message.success('密码修改成功，请重新登录')
        passwordForm.resetFields()
        // 修改密码后所有会话失效，退出登录
        logout()
        navigate('/login')
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      if (error.errorFields) return
      message.error('修改失败')
    } finally {
      setPasswordLoading(false)
    }
  }

  const saveNotifySettings = async () => {
    setNotifyLoading(true)
    try {
      const res = await api.post('/api/admin/settings/notify', notifySettings)
      if (res.data.code === 0) {
        message.success('通知设置保存成功')
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('保存失败')
    } finally {
      setNotifyLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
    fetchTelegramStatus()
    fetchDefaultEndpoint()
    fetchPaymentConfig()
    fetchPayGroups()
    fetchChannelAutoClose()
  }, [])

  if (loading) {
    return <div>加载中...</div>
  }

  // RAM 用户界面
  if (isRam && profileData?.isRam) {
    const hasSettingsPermission = profileData.hasSettingsPermission
    const ramAccountInfo = profileData.ramInfo

    return (
      <div>
        <h2 className="page-title">个人资料</h2>

        <Alert
          message="子账户模式"
          description={`您当前以子账户身份登录，显示名称：${ramAccountInfo?.display_name || '未设置'}`}
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            {/* RAM 账户信息 */}
            <Card title="账户信息" style={{ marginBottom: 16 }}>
              <Form layout="horizontal" labelCol={{ xs: { span: 24 }, sm: { span: 6 } }} wrapperCol={{ xs: { span: 24 }, sm: { span: 18 } }}>
                <Form.Item label="账户ID">
                  <span 
                    onClick={() => copyToClipboard(ramAccountInfo?.user_id, '账户ID')}
                    style={{
                      fontFamily: 'monospace',
                      background: 'var(--bg-color)',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#1890ff'}
                    onMouseLeave={(e) => e.target.style.color = 'inherit'}
                    title="点击复制"
                  >
                    {ramAccountInfo?.user_id}
                  </span>
                </Form.Item>
                <Form.Item label="显示名称">
                  <span>{ramAccountInfo?.display_name || '未设置'}</span>
                </Form.Item>
                <Form.Item label="权限">
                  <span>
                    {ramAccountInfo?.permissions?.includes('admin')
                      ? '管理员（全部权限）'
                      : ((ramAccountInfo?.permissions || [])
                        .map(p => {
                          const labels = { order: '流水管理', merchant: '商户管理', channel: '通道管理', settings: '系统设置' }
                          return labels[p] || p
                        })
                        .join('、') || '无')}
                  </span>
                </Form.Item>
                <Form.Item label="创建时间">
                  <span>{formatTime(ramAccountInfo?.created_at)}</span>
                </Form.Item>
                <Form.Item label="最后登录">
                  <span>{formatTime(ramAccountInfo?.last_login_at) || '从未登录'}</span>
                </Form.Item>
              </Form>
            </Card>

            {/* 修改密码 */}
            <Card title="修改密码" style={{ marginBottom: 16 }}>
              <Form form={passwordForm} layout="horizontal" labelCol={{ xs: { span: 24 }, sm: { span: 6 } }} wrapperCol={{ xs: { span: 24 }, sm: { span: 18 } }}>
                <Form.Item
                  label="当前密码"
                  name="oldPassword"
                  rules={[{ required: true, message: '请输入当前密码' }]}
                >
                  <Input.Password style={{ maxWidth: 300 }} />
                </Form.Item>
                <Form.Item
                  label="新密码"
                  name="newPassword"
                  rules={[
                    { required: true, message: '请输入新密码' },
                    { min: 6, message: '密码长度不能少于6位' }
                  ]}
                >
                  <Input.Password style={{ maxWidth: 300 }} />
                </Form.Item>
                <Form.Item
                  label="确认密码"
                  name="confirmPassword"
                  rules={[{ required: true, message: '请确认新密码' }]}
                >
                  <Input.Password style={{ maxWidth: 300 }} />
                </Form.Item>
                <Form.Item wrapperCol={{ xs: { span: 24 }, sm: { offset: 6, span: 18 } }}>
                  <Button type="primary" loading={passwordLoading} onClick={changePassword}>
                    修改密码
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            {/* 有 settings 权限时显示 API 节点设置 */}
            {hasSettingsPermission && (
              <Card title="API节点设置" style={{ marginBottom: 16 }}>
                <Form layout="horizontal" labelCol={{ xs: { span: 24 }, sm: { span: 6 } }} wrapperCol={{ xs: { span: 24 }, sm: { span: 18 } }}>
                  <Form.Item label="API节点" extra={<span style={{ color: '#999' }}>商户将使用此地址接入支付API，需要配置域名指向本服务</span>}>
                    <Input
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                      placeholder="https://your-domain.com"
                      style={{ maxWidth: 400 }}
                    />
                  </Form.Item>
                  <Form.Item wrapperCol={{ xs: { span: 24 }, sm: { offset: 6, span: 18 } }}>
                    <Button type="primary" loading={apiSaveLoading} onClick={saveApiEndpoint}>
                      保存
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            )}

            {/* Telegram 绑定 */}
            <Card title="Telegram 通知">
              {telegramStatus.bound ? (
                <>
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="绑定状态">
                      <Tag color="success" icon={<CheckCircleOutlined />}>已绑定</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Telegram 账号">
                      {telegramStatus.nickname || telegramStatus.username || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="绑定时间">
                      {formatTime(telegramStatus.createdAt)}
                    </Descriptions.Item>
                  </Descriptions>
                  <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                    <Button icon={<SendOutlined />} onClick={sendTestMessage} loading={telegramLoading}>
                      发送测试
                    </Button>
                    <Button danger icon={<DisconnectOutlined />} onClick={unbindTelegram} loading={telegramLoading}>
                      解除绑定
                    </Button>
                  </div>
                  <Alert
                    message="提示"
                    description="在 Telegram 中发送 /settings 命令可配置通知偏好"
                    type="info"
                    showIcon
                    style={{ marginTop: 16 }}
                  />
                </>
              ) : (
                <>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    绑定 Telegram 后可接收结算、余额等实时通知
                  </p>
                  <Button 
                    type="primary" 
                    icon={<LinkOutlined />} 
                    onClick={generateBindLink}
                    loading={bindLoading}
                  >
                    绑定 Telegram
                  </Button>
                </>
              )}
            </Card>
          </Col>
        </Row>

        {/* Telegram 绑定弹窗 */}
        <Modal
          title="绑定 Telegram"
          open={bindModal}
          onCancel={() => setBindModal(false)}
          footer={[
            <Button key="close" onClick={() => setBindModal(false)}>关闭</Button>,
            <Button key="refresh" type="primary" onClick={() => { setBindModal(false); fetchTelegramStatus(); }}>
              我已绑定
            </Button>
          ]}
          width={480}
        >
          <div style={{ padding: '16px 0' }}>
            <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>
              请选择以下任意方式完成绑定：
            </p>
            
            <div style={{ background: 'var(--bg-color)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>方式一：点击链接</div>
              <Button type="primary" href={bindUrl} target="_blank" block>
                打开 Telegram 绑定
              </Button>
            </div>
            
            <div style={{ background: 'var(--bg-color)', padding: 16, borderRadius: 8 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>方式二：发送指令（推荐）</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                {botName ? `在 Telegram 中搜索机器人 @${botName}，发送以下指令：` : '在 Telegram 中向机器人发送以下指令：'}
              </p>
              <Input.TextArea 
                value={bindCommand}
                readOnly
                autoSize
                style={{ fontFamily: 'monospace', marginBottom: 8 }}
              />
              <Button 
                size="small" 
                onClick={() => {
                  navigator.clipboard.writeText(bindCommand)
                  message.success('已复制到剪贴板')
                }}
              >
                复制指令
              </Button>
            </div>
            
            <Alert
              message="绑定码有效期：10 分钟"
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          </div>
        </Modal>
      </div>
    )
  }

  // 主账户界面（原有逻辑）
  return (
    <div>
      <h2 className="page-title">平台设置</h2>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          {/* 网站设置 */}
          <Card title="网站设置" style={{ marginBottom: 16 }}>
            <Form layout="horizontal" labelCol={{ xs: { span: 24 }, sm: { span: 6 } }} wrapperCol={{ xs: { span: 24 }, sm: { span: 18 } }}>
              <Form.Item 
                label="网站名称" 
                extra="显示在登录页面和通知消息中"
              >
                <Input
                  value={profile.site_name}
                  onChange={(e) => setProfile({ ...profile, site_name: e.target.value })}
                  placeholder="支付平台"
                  style={{ maxWidth: 300 }}
                />
              </Form.Item>
              <Form.Item 
                label="API端点" 
                extra={
                  <span style={{ color: '#999' }}>
                    商户将使用此地址接入支付API，需要配置域名指向本服务
                  </span>
                }
              >
                <Input
                  value={profile.api_endpoint}
                  onChange={(e) => setProfile({ ...profile, api_endpoint: e.target.value })}
                  placeholder="https://your-domain.com"
                  style={{ maxWidth: 400 }}
                />
              </Form.Item>
              <Form.Item wrapperCol={{ xs: { span: 24 }, sm: { offset: 6, span: 18 } }}>
                <Button type="primary" loading={saveLoading} onClick={saveProfile}>
                  保存修改
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {/* 支付设置 */}
          <Card title="支付设置" style={{ marginBottom: 16 }}>
            <Form layout="horizontal" labelCol={{ xs: { span: 24 }, sm: { span: 6 } }} wrapperCol={{ xs: { span: 24 }, sm: { span: 18 } }}>
              <Form.Item 
                label="订单名称模板"
                extra={
                  <span style={{ color: '#999' }}>
                    可使用变量：[name]原商品名、[order]订单号、[outorder]商户订单号、[time]时间戳、[merchant]商户ID
                  </span>
                }
              >
                <Input
                  value={paymentConfig.order_name_template}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, order_name_template: e.target.value })}
                  placeholder="留空则显示原商品名，例如：[name]-[order]"
                  style={{ maxWidth: 400 }}
                />
              </Form.Item>
              <Form.Item 
                label="收银台隐藏商品名"
                extra={
                  <span style={{ color: '#999' }}>
                    启用后收银台页面将显示订单名称模板替换后的名称
                  </span>
                }
              >
                <Select
                  value={paymentConfig.page_order_name}
                  onChange={(v) => setPaymentConfig({ ...paymentConfig, page_order_name: v })}
                  style={{ width: 120 }}
                >
                  <Select.Option value="0">否</Select.Option>
                  <Select.Option value="1">是</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item 
                label="回调隐藏商品名"
                extra={
                  <span style={{ color: '#999' }}>
                    启用后回调通知中的商品名固定为 "product"
                  </span>
                }
              >
                <Select
                  value={paymentConfig.notify_order_name}
                  onChange={(v) => setPaymentConfig({ ...paymentConfig, notify_order_name: v })}
                  style={{ width: 120 }}
                >
                  <Select.Option value="0">否</Select.Option>
                  <Select.Option value="1">是</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item 
                label="商户自助退款"
                extra={
                  <span style={{ color: '#999' }}>
                    开启后商户可在订单页面直接发起退款（原路退回），无需管理员审批
                  </span>
                }
              >
                <Select
                  value={paymentConfig.user_refund}
                  onChange={(v) => setPaymentConfig({ ...paymentConfig, user_refund: v })}
                  style={{ width: 120 }}
                >
                  <Select.Option value="0">关闭</Select.Option>
                  <Select.Option value="1">开启</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item 
                label="商户自动开通"
                extra={
                  <span style={{ color: '#999' }}>
                    开启后新注册的商户将自动开通，无需管理员手动批准
                  </span>
                }
              >
                <Select
                  value={paymentConfig.auto_approve_merchant}
                  onChange={(v) => setPaymentConfig({ ...paymentConfig, auto_approve_merchant: v })}
                  style={{ width: 120 }}
                >
                  <Select.Option value="0">关闭</Select.Option>
                  <Select.Option value="1">开启</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item 
                label="域名白名单"
                extra={
                  <span style={{ color: '#999' }}>
                    开启后仅允许商户配置的白名单域名调用支付接口，关闭则任何域名都可调用
                  </span>
                }
              >
                <Select
                  value={paymentConfig.domain_whitelist_enabled}
                  onChange={(v) => setPaymentConfig({ ...paymentConfig, domain_whitelist_enabled: v })}
                  style={{ width: 120 }}
                >
                  <Select.Option value="0">关闭</Select.Option>
                  <Select.Option value="1">开启</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item wrapperCol={{ xs: { span: 24 }, sm: { offset: 6, span: 18 } }}>
                <Button type="primary" loading={paymentConfigLoading} onClick={savePaymentConfig}>
                  保存设置
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {/* 通道自动关闭 */}
          <Card title="通道自动关闭" style={{ marginBottom: 16 }}>
            <Form layout="horizontal" labelCol={{ xs: { span: 24 }, sm: { span: 6 } }} wrapperCol={{ xs: { span: 24 }, sm: { span: 18 } }}>
              <Form.Item 
                label="异常关键词"
                extra={
                  <span style={{ color: '#999' }}>
                    当支付下单返回的错误消息包含以下关键词时，自动关闭该支付通道。多个关键词用 | 分隔，如：收款功能已被限制|商户已被冻结
                  </span>
                }
              >
                <Input.TextArea
                  value={channelAutoClose.keywords}
                  onChange={(e) => setChannelAutoClose({ ...channelAutoClose, keywords: e.target.value })}
                  placeholder="留空表示不启用，多个关键词用 | 分隔"
                  rows={3}
                  style={{ maxWidth: 500 }}
                />
              </Form.Item>
              <Form.Item 
                label="关闭时通知"
                extra={
                  <span style={{ color: '#999' }}>
                    通道被自动关闭时，发送 Telegram 通知给管理员
                  </span>
                }
              >
                <Switch
                  checked={channelAutoClose.noticeEnabled}
                  onChange={(v) => setChannelAutoClose({ ...channelAutoClose, noticeEnabled: v })}
                />
              </Form.Item>
              <Form.Item wrapperCol={{ xs: { span: 24 }, sm: { offset: 6, span: 18 } }}>
                <Button type="primary" loading={channelAutoCloseLoading} onClick={saveChannelAutoClose}>
                  保存设置
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {/* 修改密码 */}
          <Card title="修改密码" style={{ marginBottom: 16 }}>
            <Form form={passwordForm} layout="horizontal" labelCol={{ xs: { span: 24 }, sm: { span: 6 } }} wrapperCol={{ xs: { span: 24 }, sm: { span: 18 } }}>
              <Form.Item
                label="当前密码"
                name="oldPassword"
                rules={[{ required: true, message: '请输入当前密码' }]}
              >
                <Input.Password style={{ maxWidth: 300 }} />
              </Form.Item>
              <Form.Item
                label="新密码"
                name="newPassword"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 6, message: '密码长度不能少于6位' }
                ]}
              >
                <Input.Password style={{ maxWidth: 300 }} />
              </Form.Item>
              <Form.Item
                label="确认密码"
                name="confirmPassword"
                rules={[{ required: true, message: '请确认新密码' }]}
              >
                <Input.Password style={{ maxWidth: 300 }} />
              </Form.Item>
              <Form.Item wrapperCol={{ xs: { span: 24 }, sm: { offset: 6, span: 18 } }}>
                <Button type="primary" loading={passwordLoading} onClick={changePassword}>
                  修改密码
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          {/* 账户统计 */}
          <Card title="账户统计" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>商户数量</span>
              <span style={{ fontWeight: 600 }}>{stats.merchantCount || 0}</span>
            </div>
            <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>累计交易额</span>
              <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>¥{formatMoney(stats.totalMoney)}</span>
            </div>
            <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>累计手续费收入</span>
              <span style={{ fontWeight: 600, color: 'var(--success-color)' }}>¥{formatMoney(stats.totalFee)}</span>
            </div>
            <div style={{ padding: '12px 0', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>累计订单数</span>
              <span style={{ fontWeight: 600 }}>{stats.orderCount || 0}</span>
            </div>
          </Card>

          {/* 测试支付设置（独立栏目） */}
          <Card title="测试支付设置" style={{ marginBottom: 16 }}>
            <Form layout="vertical">
              <Form.Item
                label="测试支付入口"
                extra={
                  <span style={{ color: '#999' }}>
                    开启后首页和文档页顶部将显示测试支付入口
                  </span>
                }
              >
                <Select
                  value={testPayConfig.test_pay_enabled}
                  onChange={(v) => setTestPayConfig({ ...testPayConfig, test_pay_enabled: v })}
                >
                  <Select.Option value="0">关闭</Select.Option>
                  <Select.Option value="1">开启</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item
                label="测试支付组"
                extra={
                  <span style={{ color: '#999' }}>
                    测试订单将使用该支付组中的支付方式
                  </span>
                }
              >
                <Select
                  value={testPayConfig.test_pay_group_id || undefined}
                  onChange={(v) => setTestPayConfig({ ...testPayConfig, test_pay_group_id: v || '' })}
                  placeholder="请选择支付组"
                  loading={payGroupsLoading}
                  disabled={testPayConfig.test_pay_enabled !== '1'}
                  allowClear
                >
                  {payGroups.map((group) => (
                    <Select.Option key={group.id} value={String(group.id)}>
                      {group.name}{group.is_default ? '（默认）' : ''}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                label="最大可输入金额"
                extra={
                  <span style={{ color: '#999' }}>
                    用户在测试支付页可输入的最大金额（单位：元）
                  </span>
                }
              >
                <InputNumber
                  min={0.01}
                  max={99999999}
                  step={0.01}
                  precision={2}
                  value={parseFloat(testPayConfig.test_pay_max_amount || '0') || 0}
                  onChange={(v) => setTestPayConfig({ ...testPayConfig, test_pay_max_amount: v ? String(v) : '' })}
                  style={{ width: '100%' }}
                  disabled={testPayConfig.test_pay_enabled !== '1'}
                  addonAfter="元"
                />
              </Form.Item>
              <Form.Item
                label="支付成功秒退"
                extra={
                  <span style={{ color: '#999' }}>
                    开启后测试订单支付成功会立即尝试原路退款，降低恶意投诉风险
                  </span>
                }
              >
                <Select
                  value={testPayConfig.test_pay_auto_refund}
                  onChange={(v) => setTestPayConfig({ ...testPayConfig, test_pay_auto_refund: v })}
                  disabled={testPayConfig.test_pay_enabled !== '1'}
                >
                  <Select.Option value="0">否</Select.Option>
                  <Select.Option value="1">是</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item>
                <Button type="primary" loading={testPayConfigLoading} onClick={saveTestPayConfig} block>
                  保存测试支付设置
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {/* Telegram 绑定 */}
          <Card title="Telegram 通知" style={{ marginBottom: 16 }}>
            {telegramStatus.bound ? (
              <>
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="绑定状态">
                    <Tag color="success" icon={<CheckCircleOutlined />}>已绑定</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Telegram 账号">
                    {telegramStatus.nickname || telegramStatus.username || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="绑定时间">
                    {formatTime(telegramStatus.createdAt)}
                  </Descriptions.Item>
                </Descriptions>
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  <Button icon={<SendOutlined />} onClick={sendTestMessage} loading={telegramLoading}>
                    发送测试
                  </Button>
                  <Button danger icon={<DisconnectOutlined />} onClick={unbindTelegram} loading={telegramLoading}>
                    解除绑定
                  </Button>
                </div>
                <Alert
                  message="提示"
                  description="在 Telegram 中发送 /settings 命令可配置通知偏好"
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              </>
            ) : (
              <>
                <p style={{ color: 'var(--text-secondary)' }}>
                  绑定 Telegram 后可接收结算、余额等实时通知
                </p>
                <Button 
                  type="primary" 
                  icon={<LinkOutlined />} 
                  onClick={generateBindLink}
                  loading={bindLoading}
                >
                  绑定 Telegram
                </Button>
              </>
            )}
          </Card>

          {/* 通知设置 */}
          <Card title="通知设置">
            <Form layout="vertical">
              <Form.Item label="邮箱通知">
                <Switch
                  checked={notifySettings.emailNotify}
                  onChange={(v) => setNotifySettings({ ...notifySettings, emailNotify: v })}
                />
              </Form.Item>
              {notifySettings.emailNotify && (
                <Form.Item label="通知邮箱">
                  <Input
                    value={notifySettings.email}
                    onChange={(e) => setNotifySettings({ ...notifySettings, email: e.target.value })}
                    placeholder="接收通知的邮箱"
                  />
                </Form.Item>
              )}
              <Form.Item label="大额订单提醒">
                <Switch
                  checked={notifySettings.largeOrderNotify}
                  onChange={(v) => setNotifySettings({ ...notifySettings, largeOrderNotify: v })}
                />
              </Form.Item>
              {notifySettings.largeOrderNotify && (
                <Form.Item label="提醒金额阈值">
                  <InputNumber
                    value={notifySettings.largeOrderThreshold}
                    onChange={(v) => setNotifySettings({ ...notifySettings, largeOrderThreshold: v })}
                    min={0}
                    addonAfter="元"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              )}
              <Form.Item>
                <Button type="primary" loading={notifyLoading} onClick={saveNotifySettings} block>
                  保存设置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>

      {/* Telegram 绑定弹窗 */}
      <Modal
        title="绑定 Telegram"
        open={bindModal}
        onCancel={() => setBindModal(false)}
        footer={[
          <Button key="close" onClick={() => setBindModal(false)}>关闭</Button>,
          <Button key="refresh" type="primary" onClick={() => { setBindModal(false); fetchTelegramStatus(); }}>
            我已绑定
          </Button>
        ]}
        width={480}
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>
            请选择以下任意方式完成绑定：
          </p>
          
          <div style={{ background: 'var(--bg-color)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>方式一：点击链接</div>
            <Button type="primary" href={bindUrl} target="_blank" block>
              打开 Telegram 绑定
            </Button>
          </div>
          
          <div style={{ background: 'var(--bg-color)', padding: 16, borderRadius: 8 }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>方式二：发送指令（推荐）</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              {botName ? `在 Telegram 中搜索机器人 @${botName}，发送以下指令：` : '在 Telegram 中向机器人发送以下指令：'}
            </p>
            <Input.TextArea 
              value={bindCommand}
              readOnly
              autoSize
              style={{ fontFamily: 'monospace', marginBottom: 8 }}
            />
            <Button 
              size="small" 
              onClick={() => {
                navigator.clipboard.writeText(bindCommand)
                message.success('已复制到剪贴板')
              }}
            >
              复制指令
            </Button>
          </div>
          
          <Alert
            message="绑定码有效期：10 分钟"
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        </div>
      </Modal>
    </div>
  )
}

export default Profile

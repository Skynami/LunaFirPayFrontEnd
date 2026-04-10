import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Descriptions, Tag, message, Spin, Alert, Typography, Space, Row, Col, Button, Modal, Form, Input } from 'antd'
import { CheckCircleOutlined, SendOutlined, DisconnectOutlined, LinkOutlined } from '@ant-design/icons'
import api from '../../utils/api'
import { useUserStore } from '../../stores/userStore'

const { Text } = Typography

function Services() {
  const navigate = useNavigate()
  const { isRam, logout } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({})
  
  // Telegram 相关状态
  const [telegramStatus, setTelegramStatus] = useState({ bound: false })
  const [telegramLoading, setTelegramLoading] = useState(false)
  const [bindModal, setBindModal] = useState(false)
  const [bindUrl, setBindUrl] = useState('')
  const [bindCommand, setBindCommand] = useState('')
  const [botName, setBotName] = useState('')
  const [bindLoading, setBindLoading] = useState(false)
  
  // 密码修改相关
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordForm] = Form.useForm()
  
  // 邮箱修改相关
  const [showEditEmail, setShowEditEmail] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailForm] = Form.useForm()

  const isEnabledStatus = (status) => status === 'active' || status === 'approved'

  const getStatusTag = (status) => {
    const map = {
      inactive: { color: 'warning', text: '未开通' },
      active: { color: 'success', text: '正常' },
      paused: { color: 'warning', text: '已暂停' },
      approved: { color: 'success', text: '正常' },
      disabled: { color: 'warning', text: '已暂停' }
    }
    const v = map[status] || { color: 'default', text: status || '未知' }
    return <Tag color={v.color}>{v.text}</Tag>
  }

  const formatTime = (t) => {
    if (!t) return '-'
    return new Date(t).toLocaleString('zh-CN')
  }

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/merchant/profile')
      if (res.data.code === 0) {
        setProfile(res.data.data)
      }
    } catch (error) {
      console.error('获取资料失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTelegramStatus = async () => {
    try {
      const res = await api.get('/api/merchant/telegram/status')
      if (res.data.code === 0) {
        setTelegramStatus(res.data.data)
      }
    } catch (error) {
      console.error('获取TG状态失败:', error)
    }
  }

  const generateBindLink = async () => {
    setBindLoading(true)
    try {
      const res = await api.post('/api/merchant/telegram/bindToken')
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

  const unbindTelegram = async () => {
    Modal.confirm({
      title: '确认解除绑定',
      content: '解除绑定后将无法接收 Telegram 通知，确定继续？',
      onOk: async () => {
        setTelegramLoading(true)
        try {
          const res = await api.post('/api/merchant/telegram/unbind')
          if (res.data.code === 0) {
            message.success('解绑成功')
            fetchTelegramStatus()
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

  const sendTestMessage = async () => {
    setTelegramLoading(true)
    try {
      const res = await api.post('/api/merchant/telegram/test')
      if (res.data.code === 0) {
        message.success('测试消息已发送')
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('发送失败')
    } finally {
      setTelegramLoading(false)
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
        setShowChangePassword(false)
        passwordForm.resetFields()
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

  const updateEmail = async () => {
    try {
      const values = await emailForm.validateFields()
      setEmailLoading(true)
      const res = await api.post('/api/merchant/profile/email', {
        email: values.email
      })
      if (res.data.code === 0) {
        message.success('邮箱更新成功')
        setShowEditEmail(false)
        fetchProfile()
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      if (error.errorFields) return
      message.error('更新失败')
    } finally {
      setEmailLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
    fetchTelegramStatus()
  }, [])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  const status = profile?.provider_status || 'inactive'
  const enabled = isEnabledStatus(status)

  // RAM 子账户显示简化页面
  if (isRam) {
    return (
      <div>
        <h2 className="page-title">服务管理</h2>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="账户信息">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="账户ID">{profile.user_id}</Descriptions.Item>
                <Descriptions.Item label="显示名称">{profile.display_name || '-'}</Descriptions.Item>
                <Descriptions.Item label="所属商户">{profile.owner_name}</Descriptions.Item>
              </Descriptions>

              <div style={{ marginTop: 16 }}>
                <Button type="primary" onClick={() => setShowChangePassword(true)}>修改密码</Button>
              </div>
            </Card>
          </Col>

          <Col xs={24} md={12}>
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
                    绑定 Telegram 后可接收订单、余额、结算等实时通知
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

        {/* 修改密码弹窗 */}
        <Modal
          title="修改密码"
          open={showChangePassword}
          onCancel={() => setShowChangePassword(false)}
          onOk={changePassword}
          confirmLoading={passwordLoading}
          width={400}
        >
          <Form form={passwordForm} layout="horizontal" labelCol={{ span: 8 }}>
            <Form.Item
              label="旧密码"
              name="oldPassword"
              rules={[{ required: true, message: '请输入旧密码' }]}
            >
              <Input.Password placeholder="请输入旧密码" />
            </Form.Item>
            <Form.Item
              label="新密码"
              name="newPassword"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码至少6个字符' }
              ]}
            >
              <Input.Password placeholder="请输入新密码" />
            </Form.Item>
            <Form.Item
              label="确认新密码"
              name="confirmPassword"
              rules={[{ required: true, message: '请再次输入新密码' }]}
            >
              <Input.Password placeholder="请再次输入新密码" />
            </Form.Item>
          </Form>
        </Modal>

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
              message="绑定码有效期为 10 分钟"
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          </div>
        </Modal>
      </div>
    )
  }

  return (
    <div>
      <h2 className="page-title">服务管理</h2>

      {/* 状态提示 */}
      {status === 'inactive' && (
        <Alert
          message="账户未开通"
          description="您的商户账户尚未开通，请联系管理员开通后即可使用支付服务。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      {status === 'paused' && (
        <Alert
          message="账户已暂停"
          description="您的商户账户已被暂停，暂时无法使用支付服务。如有疑问请联系管理员。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        {/* 基本信息 */}
        <Col xs={24} md={12}>
          <Card title="基本信息">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="商户ID">{profile.merchant_id || '-'}</Descriptions.Item>
              <Descriptions.Item label="用户名">{profile.username}</Descriptions.Item>
              <Descriptions.Item label="商户状态">{getStatusTag(status)}</Descriptions.Item>
              <Descriptions.Item label="邮箱">
                <span 
                  onClick={() => {
                    emailForm.setFieldsValue({ email: profile.email || '' })
                    setShowEditEmail(true)
                  }}
                  style={{ cursor: 'pointer', color: '#1890ff' }}
                >
                  {profile.email || '未设置'} <span style={{ fontSize: 12 }}>[编辑]</span>
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">{formatTime(profile.created_at)}</Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <Button type="primary" onClick={() => setShowChangePassword(true)}>修改密码</Button>
            </div>
          </Card>
        </Col>

        {/* Telegram 绑定 */}
        <Col xs={24} md={12}>
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
                  description="在 Telegram 中发送 /settings 命令可配置通知偏好和 PID 过滤"
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              </>
            ) : (
              <>
                <p style={{ color: 'var(--text-secondary)' }}>
                  绑定 Telegram 后可接收订单、余额、结算等实时通知
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

        {/* API 接入信息 */}
        <Col xs={24}>
          <Card title="API 接入信息">
            {enabled ? (
              <Descriptions column={1} bordered>
                <Descriptions.Item label="API 接入点">
                  <Space>
                    {profile?.api_endpoint ? (
                      <Text code copyable={{ onCopy: () => message.success('接入点已复制') }}>
                        {profile.api_endpoint}
                      </Text>
                    ) : (
                      <Text type="warning">管理员未设置 API 端点</Text>
                    )}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="商户PID">
                  <Space>
                    <Text code copyable={{ onCopy: () => message.success('PID已复制') }}>
                      {profile?.pid || '-'}
                    </Text>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label={<span><Tag color="blue">V1</Tag> 商户密钥 (KEY)</span>}>
                  <Space>
                    <Text code copyable={{ onCopy: () => message.success('KEY已复制') }}>
                      {profile?.api_key || '-'}
                    </Text>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label={<span><Tag color="green">V2</Tag> 商户私钥 (RSA)</span>}>
                  {profile?.rsa_private_key ? (
                    <Text code copyable={{ text: profile.rsa_private_key, onCopy: () => message.success('私钥已复制') }} style={{ wordBreak: 'break-all', fontSize: 12 }}>
                      {profile.rsa_private_key.length > 100 ? profile.rsa_private_key.substring(0, 100) + '...' : profile.rsa_private_key}
                    </Text>
                  ) : (
                    <Text type="secondary">-</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label={<span><Tag color="green">V2</Tag> 商户公钥 (RSA)</span>}>
                  {profile?.rsa_public_key ? (
                    <Text code copyable={{ text: profile.rsa_public_key, onCopy: () => message.success('公钥已复制') }} style={{ wordBreak: 'break-all', fontSize: 12 }}>
                      {profile.rsa_public_key.length > 100 ? profile.rsa_public_key.substring(0, 100) + '...' : profile.rsa_public_key}
                    </Text>
                  ) : (
                    <Text type="secondary">-</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="API 文档">
                  <a href="/doc" target="_blank" rel="noopener noreferrer">
                    查看 API 接入文档
                  </a>
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Alert
                message="接入信息不可用"
                description="商户账户开通后才能获取 PID 和 KEY 进行 API 对接。"
                type="info"
                showIcon
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 修改密码弹窗 */}
      <Modal
        title="修改密码"
        open={showChangePassword}
        onCancel={() => setShowChangePassword(false)}
        onOk={changePassword}
        confirmLoading={passwordLoading}
        width={400}
      >
        <Form form={passwordForm} layout="horizontal" labelCol={{ span: 8 }}>
          <Form.Item
            label="旧密码"
            name="oldPassword"
            rules={[{ required: true, message: '请输入旧密码' }]}
          >
            <Input.Password placeholder="请输入旧密码" />
          </Form.Item>
          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            rules={[{ required: true, message: '请再次输入新密码' }]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改邮箱弹窗 */}
      <Modal
        title="修改邮箱"
        open={showEditEmail}
        onCancel={() => setShowEditEmail(false)}
        onOk={updateEmail}
        confirmLoading={emailLoading}
        width={400}
      >
        <Form form={emailForm} layout="vertical">
          <Form.Item
            label="邮箱地址"
            name="email"
            rules={[
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入邮箱地址" />
          </Form.Item>
        </Form>
        <Alert
          message="邮箱用于密码找回，请确保填写正确"
          type="info"
          showIcon
        />
      </Modal>

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
            <div style={{ fontWeight: 500, marginBottom: 8 }}>方式二：发送指令</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              在 Telegram 中搜索机器人，发送以下指令：
            </p>
            <Input.TextArea 
              value={`/start ${bindUrl.split('start=')[1] || ''}`}
              readOnly
              autoSize
              style={{ fontFamily: 'monospace', marginBottom: 8 }}
            />
            <Button 
              size="small" 
              onClick={() => {
                navigator.clipboard.writeText(`/start ${bindUrl.split('start=')[1] || ''}`)
                message.success('已复制到剪贴板')
              }}
            >
              复制指令
            </Button>
          </div>
          
          <Alert
            message="绑定码有效期为 5 分钟"
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        </div>
      </Modal>
    </div>
  )
}

export default Services


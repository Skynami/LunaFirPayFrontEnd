import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Form, Input, Button, message, Result } from 'antd'
import { MailOutlined, LockOutlined } from '@ant-design/icons'
import api from '../utils/api'

function ForgotPassword() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [success, setSuccess] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(true) // 是否需要邮箱验证码
  const [turnstileEnabled, setTurnstileEnabled] = useState(false)
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('')
  const [configLoading, setConfigLoading] = useState(true)
  const [form] = Form.useForm()
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRef = useRef(null)
  const widgetIdRef = useRef(null)

  // 获取配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/api/auth/config')
        if (res.data.code === 0) {
          setEmailEnabled(res.data.data.emailEnabled === true)
          setTurnstileEnabled(res.data.data.turnstileEnabled === true)
          setTurnstileSiteKey(res.data.data.turnstileSiteKey || '')
        } else {
          // 配置获取失败，默认不需要验证码
          setEmailEnabled(false)
        }
      } catch (error) {
        console.error('获取配置失败:', error)
        // 请求失败，默认不需要验证码
        setEmailEnabled(false)
      } finally {
        setConfigLoading(false)
      }
    }
    fetchConfig()
  }, [])

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // 初始化 Turnstile（仅当启用时）
  useEffect(() => {
    if (!turnstileEnabled || !turnstileSiteKey || configLoading) return

    const initTurnstile = () => {
      if (window.turnstile && turnstileRef.current && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: turnstileSiteKey,
          callback: (token) => {
            setTurnstileToken(token)
          },
          'expired-callback': () => {
            setTurnstileToken('')
          },
          'error-callback': () => {
            setTurnstileToken('')
          }
        })
      }
    }

    if (window.turnstile) {
      initTurnstile()
    } else {
      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval)
          initTurnstile()
        }
      }, 100)
      return () => clearInterval(checkInterval)
    }

    return () => {
      if (widgetIdRef.current) {
        try {
          window.turnstile?.remove(widgetIdRef.current)
        } catch (e) {}
        widgetIdRef.current = null
      }
    }
  }, [turnstileEnabled, turnstileSiteKey, configLoading])

  // 发送验证码
  const handleSendCode = async () => {
    const email = form.getFieldValue('email')
    if (!email) {
      message.error('请先输入邮箱')
      return
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      message.error('请输入正确的邮箱格式')
      return
    }

    if (turnstileEnabled && !turnstileToken) {
      message.error('请先完成人机验证')
      return
    }

    setSendingCode(true)
    try {
      const res = await api.post('/api/verification/send', {
        email,
        type: 'reset',
        turnstileToken: turnstileEnabled ? turnstileToken : undefined
      })
      
      if (res.data.code === 0) {
        message.success('验证码已发送，请查收邮件')
        setCountdown(60)
        // 重置 Turnstile
        if (turnstileEnabled && widgetIdRef.current) {
          window.turnstile?.reset(widgetIdRef.current)
          setTurnstileToken('')
        }
      } else {
        message.error(res.data.msg || '发送失败')
        if (turnstileEnabled && widgetIdRef.current) {
          window.turnstile?.reset(widgetIdRef.current)
          setTurnstileToken('')
        }
      }
    } catch (error) {
      message.error('发送失败：' + error.message)
      if (turnstileEnabled && widgetIdRef.current) {
        window.turnstile?.reset(widgetIdRef.current)
        setTurnstileToken('')
      }
    } finally {
      setSendingCode(false)
    }
  }

  // 重置密码
  const handleResetPassword = async (values) => {
    if (turnstileEnabled && !turnstileToken) {
      message.error('请完成人机验证')
      return
    }
    
    setLoading(true)
    try {
      const res = await api.post('/api/auth/reset-password', {
        email: values.email,
        verificationCode: values.verificationCode,
        newPassword: values.newPassword,
        turnstileToken: turnstileEnabled ? turnstileToken : undefined
      })
      
      if (res.data.code === 0) {
        setSuccess(true)
      } else {
        message.error(res.data.msg || '重置失败')
        if (turnstileEnabled && widgetIdRef.current) {
          window.turnstile?.reset(widgetIdRef.current)
          setTurnstileToken('')
        }
      }
    } catch (error) {
      message.error('重置失败：' + error.message)
      if (turnstileEnabled && widgetIdRef.current) {
        window.turnstile?.reset(widgetIdRef.current)
        setTurnstileToken('')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <Result
            status="success"
            title="密码重置成功"
            subTitle="您的密码已成功重置，请使用新密码登录"
            extra={[
              <Button type="primary" key="login" onClick={() => navigate('/login')}>
                去登录
              </Button>
            ]}
          />
        </div>
      </div>
    )
  }

  // 如果邮件功能未启用，显示提示
  if (!configLoading && !emailEnabled) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <Result
            status="warning"
            title="找回密码功能不可用"
            subTitle="邮件功能未启用，无法通过邮箱重置密码。请联系管理员。"
            extra={[
              <Button type="primary" key="login" onClick={() => navigate('/login')}>
                返回登录
              </Button>
            ]}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>找回密码</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, textAlign: 'center' }}>
          请输入您的注册邮箱，我们将发送验证码帮助您重置密码
        </p>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleResetPassword}
        >
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入正确的邮箱格式' }
            ]}
          >
            <Input placeholder="请输入注册邮箱" prefix={<MailOutlined />} />
          </Form.Item>
          
          <Form.Item
            label="验证码"
            name="verificationCode"
            rules={[
              { required: true, message: '请输入验证码' }
            ]}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <Input placeholder="请输入验证码" style={{ flex: 1 }} />
              <Button 
                onClick={handleSendCode} 
                loading={sendingCode}
                disabled={countdown > 0 || (turnstileEnabled && !turnstileToken)}
                style={{ width: 120 }}
              >
                {countdown > 0 ? `${countdown}秒后重试` : '发送验证码'}
              </Button>
            </div>
          </Form.Item>
          
          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password placeholder="请输入新密码" prefix={<LockOutlined />} />
          </Form.Item>
          
          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" prefix={<LockOutlined />} />
          </Form.Item>
          
          {turnstileEnabled && (
            <Form.Item>
              <div ref={turnstileRef} style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}></div>
            </Form.Item>
          )}
          
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block disabled={turnstileEnabled && !turnstileToken}>
              重置密码
            </Button>
          </Form.Item>
        </Form>
        
        <div className="auth-footer">
          <span>想起密码了？</span>
          <Link to="/login">返回登录</Link>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword

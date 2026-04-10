import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Form, Input, Button, message, Space } from 'antd'
import { useUserStore } from '../stores/userStore'
import api from '../utils/api'

function Register() {
  const navigate = useNavigate()
  const register = useUserStore((state) => state.register)
  const [loading, setLoading] = useState(false)
  const [configLoading, setConfigLoading] = useState(true)
  const [form] = Form.useForm()
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileEnabled, setTurnstileEnabled] = useState(false)
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('')
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const turnstileRef = useRef(null)
  const widgetIdRef = useRef(null)

  // 获取配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/api/auth/config')
        if (res.data.code === 0) {
          setTurnstileEnabled(res.data.data.turnstileEnabled === true)
          setTurnstileSiteKey(res.data.data.turnstileSiteKey || '')
          setEmailEnabled(res.data.data.emailEnabled === true)
        }
      } catch (error) {
        console.error('获取配置失败:', error)
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

  // 发送验证码
  const sendVerificationCode = async () => {
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
    
    setSendingCode(true)
    try {
      const res = await api.post('/api/verification/send', {
        email,
        type: 'register',
        turnstileToken: turnstileEnabled ? turnstileToken : undefined
      })
      if (res.data.code === 0) {
        message.success('验证码已发送，请查收邮箱')
        setCountdown(60)
        // 重置 Turnstile（如果启用）
        if (turnstileEnabled && widgetIdRef.current) {
          window.turnstile?.reset(widgetIdRef.current)
          setTurnstileToken('')
        }
      } else {
        message.error(res.data.msg || '发送失败')
      }
    } catch (error) {
      message.error('发送失败：' + (error.response?.data?.msg || error.message))
    } finally {
      setSendingCode(false)
    }
  }

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

    // 等待 turnstile 脚本加载
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

  const handleRegister = async (values) => {
    if (turnstileEnabled && !turnstileToken) {
      message.error('请完成人机验证')
      return
    }
    if (emailEnabled && !values.verificationCode) {
      message.error('请输入邮箱验证码')
      return
    }
    setLoading(true)
    try {
      const registerData = {
        username: values.username,
        password: values.password,
        email: values.email,
        turnstileToken: turnstileEnabled ? turnstileToken : undefined,
        verificationCode: emailEnabled ? values.verificationCode : undefined
      }
      
      const result = await register(registerData)
      
      if (result.success) {
        message.success(result.msg || '注册成功')
        // 根据用户类型跳转
        setTimeout(() => {
          if (result.isAdmin || result.userType === 'admin') {
            navigate('/admin', { replace: true })
          } else {
            navigate('/merchant', { replace: true })
          }
        }, 100)
      } else {
        message.error(result.msg || '注册失败')
        // 重置 Turnstile
        if (turnstileEnabled && widgetIdRef.current) {
          window.turnstile?.reset(widgetIdRef.current)
          setTurnstileToken('')
        }
      }
    } catch (error) {
      message.error('注册失败：' + error.message)
      // 重置 Turnstile
      if (turnstileEnabled && widgetIdRef.current) {
        window.turnstile?.reset(widgetIdRef.current)
        setTurnstileToken('')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>商户注册</h2>
        
        <p className="register-tip" style={{ color: 'var(--text-secondary)', marginBottom: 16, textAlign: 'center' }}>
          注册商户账号，接入支付接口收款
        </p>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleRegister}
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, max: 20, message: '用户名长度为3-20个字符' }
            ]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入正确的邮箱格式' }
            ]}
          >
            <Input placeholder="请输入邮箱（用于密码找回）" />
          </Form.Item>
          {turnstileEnabled && (
            <Form.Item>
              <div ref={turnstileRef} style={{ display: 'flex', justifyContent: 'center' }}></div>
            </Form.Item>
          )}
          {emailEnabled && (
            <Form.Item
              label="邮箱验证码"
              name="verificationCode"
              rules={[{ required: true, message: '请输入邮箱验证码' }]}
            >
              <Space.Compact style={{ width: '100%' }}>
                <Input placeholder="请输入验证码" style={{ flex: 1 }} />
                <Button
                  onClick={sendVerificationCode}
                  loading={sendingCode}
                  disabled={countdown > 0 || (turnstileEnabled && !turnstileToken)}
                >
                  {countdown > 0 ? `${countdown}秒后重发` : '发送验证码'}
                </Button>
              </Space.Compact>
            </Form.Item>
          )}
          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item
            label="确认密码"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请再次输入密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading || configLoading} block disabled={turnstileEnabled && !turnstileToken}>
              注册商户账号
            </Button>
          </Form.Item>
        </Form>
        <div className="auth-footer">
          <span>已有账号？</span>
          <Link to="/login">立即登录</Link>
        </div>
      </div>
    </div>
  )
}

export default Register

import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Form, Input, Button, message, Alert, Tabs } from 'antd'
import { UserOutlined, TeamOutlined } from '@ant-design/icons'
import { useUserStore } from '../stores/userStore'

function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const login = useUserStore((state) => state.login)
  const [loading, setLoading] = useState(false)
  
  // 从 URL 参数获取默认类型
  const defaultType = searchParams.get('type') || 'merchant'
  const [loginType, setLoginType] = useState(
    defaultType === 'admin' ? 'admin' : 
    defaultType === 'ram' ? 'ram' : 'merchant'
  )

  const handleLogin = async (values) => {
    setLoading(true)
    try {
      // RAM 登录传 'ram' 作为 userType，后端会特殊处理
      const result = await login(values.username, values.password, loginType)
      if (result.success) {
        message.success('登录成功')
        setTimeout(() => {
          // RAM 用户根据 ownerType 自动跳转到对应平台
          if (result.isRam) {
            const platform = result.ownerType === 'admin' ? '/admin' : '/merchant'
            navigate(platform, { replace: true })
          } else {
            // 普通用户根据 userType 跳转
            navigate(result.userType === 'admin' ? '/admin' : '/merchant', { replace: true })
          }
        }, 100)
      } else {
        message.error(result.msg || '登录失败')
      }
    } catch (error) {
      message.error('登录失败：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const tabItems = [
    {
      key: 'merchant',
      label: (
        <span>
          <UserOutlined />
          商户登录
        </span>
      ),
    },
    {
      key: 'ram',
      label: (
        <span>
          <TeamOutlined />
          子账户登录
        </span>
      ),
    },
  ]

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>用户登录</h2>
        
        <Tabs 
          activeKey={loginType}
          onChange={(key) => setLoginType(key)}
          items={tabItems}
          centered
          style={{ marginBottom: 16 }}
        />
        
        <Form
          layout="vertical"
          onFinish={handleLogin}
        >
          <Form.Item
            label={loginType === 'ram' ? '子账户ID' : '用户名'}
            name="username"
            rules={[
              { required: true, message: loginType === 'ram' ? '请输入13位子账户ID' : '请输入用户名' },
              loginType === 'ram' ? { pattern: /^\d{13}$/, message: '子账户ID必须是13位数字' } : {}
            ]}
          >
            <Input placeholder={loginType === 'ram' ? '请输入13位数字账号' : '请输入用户名'} />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {loginType === 'ram' ? '子账户登录' : loginType === 'admin' ? '管理员登录' : '商户登录'}
            </Button>
          </Form.Item>
        </Form>
        
        {loginType === 'merchant' && (
          <div className="auth-footer">
            <span>还没有账号？</span>
            <Link to="/register">立即注册</Link>
            <span style={{ margin: '0 8px' }}>|</span>
            <Link to="/forgot-password">忘记密码</Link>
          </div>
        )}
        
        {loginType === 'ram' && (
          <Alert
            message="子账户说明"
            description="子账户由主账户创建，使用13位数字账号和分配的密码登录，登录后将进入主账户授权的平台"
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </div>
    </div>
  )
}

export default Login

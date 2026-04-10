import { useState, useEffect } from 'react'
import { Card, Row, Col, Table, Button, Tag, Alert, Modal, Form, Input, Radio, Checkbox, Switch, message, Tooltip, Typography } from 'antd'
import { PlusOutlined, CopyOutlined, ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import api from '../../utils/api'
import { formatTime } from '../../utils/time'

const { Text } = Typography

function RAM() {
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState([])

  const allPermissions = [
    { value: 'admin', label: '管理员', desc: '拥有所有权限，与其他权限互斥' },
    { value: 'order', label: '流水管理', desc: '查看和管理订单流水' },
    { value: 'merchant', label: '商户管理', desc: '管理商户、审批加入申请' },
    { value: 'channel', label: '通道管理', desc: '管理支付通道配置' },
    { value: 'finance', label: '财务管理', desc: '审批/拒绝提现申请' },
    { value: 'settings', label: '系统设置', desc: '修改系统配置、Telegram' }
  ]

  const customPermissions = allPermissions.filter(p => p.value !== 'admin')

  const [showAddMember, setShowAddMember] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addPermType, setAddPermType] = useState('admin')
  const [addPermissions, setAddPermissions] = useState([])
  const [displayName, setDisplayName] = useState('')
  
  // 创建成功后显示账号密码
  const [showCredentials, setShowCredentials] = useState(false)
  const [credentials, setCredentials] = useState({ userId: '', password: '' })

  const [showEditMember, setShowEditMember] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editFormData, setEditFormData] = useState(null)
  const [newPassword, setNewPassword] = useState('')

  const getPermissionLabel = (perm) => {
    const p = allPermissions.find(item => item.value === perm)
    return p ? p.label : perm
  }

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/ram/members')
      if (res.data.code === 0) {
        setMembers(res.data.data || [])
      }
    } catch (error) {
      message.error('获取成员列表失败')
    } finally {
      setLoading(false)
    }
  }

  const openAddDialog = () => {
    setAddPermType('admin')
    setAddPermissions([])
    setDisplayName('')
    setShowAddMember(true)
  }

  const addMember = async () => {
    if (addPermType === 'custom' && addPermissions.length === 0) {
      message.error('请至少选择一个权限')
      return
    }
    
    setAddLoading(true)
    try {
      const permissions = addPermType === 'admin' ? ['admin'] : addPermissions
      
      const res = await api.post('/api/admin/ram/add', {
        displayName: displayName || undefined,
        permissions
      })
      if (res.data.code === 0) {
        message.success('添加成功')
        setShowAddMember(false)
        // 显示账号密码
        setCredentials({
          userId: res.data.data.userId,
          password: res.data.data.password
        })
        setShowCredentials(true)
        fetchMembers()
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('添加失败')
    } finally {
      setAddLoading(false)
    }
  }

  const editMember = (row) => {
    const permissions = row.permissions || []
    const isAdmin = permissions.includes('admin')
    setEditFormData({
      id: row.id,
      user_id: row.user_id,
      displayName: row.display_name || '',
      permType: isAdmin ? 'admin' : 'custom',
      permissions: isAdmin ? [] : [...permissions],
      status: row.status
    })
    setNewPassword('')
    setShowEditMember(true)
  }

  const saveMember = async () => {
    if (editFormData.permType === 'custom' && editFormData.permissions.length === 0) {
      message.error('请至少选择一个权限')
      return
    }
    
    setEditLoading(true)
    try {
      const permissions = editFormData.permType === 'admin'
        ? ['admin']
        : editFormData.permissions
      
      const res = await api.post('/api/admin/ram/update', {
        id: editFormData.id,
        displayName: editFormData.displayName,
        permissions,
        status: editFormData.status
      })
      if (res.data.code === 0) {
        message.success('保存成功')
        setShowEditMember(false)
        fetchMembers()
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('保存失败')
    } finally {
      setEditLoading(false)
    }
  }

  const resetPassword = async () => {
    Modal.confirm({
      title: '重置密码',
      icon: <ExclamationCircleOutlined />,
      content: '确定要重置该成员的密码吗？重置后将生成新的随机密码。',
      onOk: async () => {
        try {
          const res = await api.post('/api/admin/ram/update', {
            id: editFormData.id,
            resetPassword: true
          })
          if (res.data.code === 0) {
            setNewPassword(res.data.data.newPassword)
            message.success('密码已重置')
          } else {
            message.error(res.data.msg)
          }
        } catch (error) {
          message.error('重置失败')
        }
      }
    })
  }

  const removeMember = (row) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除成员「${row.display_name || row.user_id}」吗？删除后该账号将无法登录。`,
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await api.post('/api/admin/ram/remove', { id: row.id })
          if (res.data.code === 0) {
            message.success('删除成功')
            fetchMembers()
          } else {
            message.error(res.data.msg)
          }
        } catch (error) {
          message.error('删除失败')
        }
      }
    })
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  const columns = [
    { 
      title: '账号', 
      dataIndex: 'user_id', 
      width: 150,
      render: (v) => <Text code copyable>{v}</Text>
    },
    { 
      title: '名称', 
      dataIndex: 'display_name', 
      width: 120,
      render: (v) => v || <span style={{ color: '#999' }}>-</span>
    },
    {
      title: '权限',
      dataIndex: 'permissions',
      render: (permissions) => {
        const perms = permissions || []
        return perms.length > 0 ? (
          perms.map(perm => (
            <Tag key={perm} color={perm === 'admin' ? 'red' : 'blue'} style={{ marginRight: 4 }}>
              {getPermissionLabel(perm)}
            </Tag>
          ))
        ) : (
          <span style={{ color: '#999' }}>无权限</span>
        )
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      align: 'center',
      render: (v) => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? '启用' : '禁用'}</Tag>
    },
    { 
      title: '最后登录', 
      dataIndex: 'last_login_at', 
      width: 170, 
      render: (v, row) => v ? (
        <Tooltip title={`IP: ${row.last_login_ip || '-'}`}>
          {formatTime(v)}
        </Tooltip>
      ) : <span style={{ color: '#999' }}>从未登录</span>
    },
    { title: '创建时间', dataIndex: 'created_at', width: 170, render: (v) => formatTime(v) },
    {
      title: '操作',
      width: 140,
      fixed: 'right',
      render: (_, row) => (
        <>
          <Button type="link" size="small" onClick={() => editMember(row)}>编辑</Button>
          <Button type="link" size="small" danger onClick={() => removeMember(row)}>删除</Button>
        </>
      )
    }
  ]

  return (
    <div>
      <h2 className="page-title">RAM 子账户管理</h2>

      <Alert
        message="RAM 子账户说明"
        description={
          <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
            <li>RAM子账户是独立的登录账号，用于分配给员工或合作伙伴</li>
            <li>账号格式：3位数字，由系统自动生成，无法自定义</li>
            <li>密码：8位随机字符，创建后请立即保存</li>
            <li>子账户只能访问您授权的功能模块</li>
          </ul>
        }
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card 
            title="子账户列表"
            extra={
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAddDialog}>
                创建子账户
              </Button>
            }
          >
            <Table
              columns={columns}
              dataSource={members}
              loading={loading}
              rowKey="id"
              pagination={false}
              bordered
              scroll={{ x: 'max-content' }}
              style={{ width: '100%' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="权限说明">
            <div style={{ marginTop: 8 }}>
              {allPermissions.map(perm => (
                <div key={perm.value} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>
                    <Tag color={perm.value === 'admin' ? 'red' : 'blue'}>{perm.label}</Tag>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{perm.desc}</div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 创建子账户弹窗 */}
      <Modal
        title="创建子账户"
        open={showAddMember}
        onCancel={() => setShowAddMember(false)}
        onOk={addMember}
        confirmLoading={addLoading}
        width={500}
      >
        <Alert
          message="账号和密码将由系统自动生成"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form layout="horizontal" labelCol={{ span: 6 }}>
          <Form.Item label="显示名称">
            <Input 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="可选，用于标识该账号用途"
            />
          </Form.Item>
          <Form.Item label="权限类型" required>
            <Radio.Group
              value={addPermType}
              onChange={(e) => {
                setAddPermType(e.target.value)
                if (e.target.value === 'admin') {
                  setAddPermissions([])
                }
              }}
            >
              <Radio value="admin">管理员（全部权限）</Radio>
              <Radio value="custom">自定义权限</Radio>
            </Radio.Group>
          </Form.Item>
          {addPermType === 'custom' && (
            <Form.Item label="选择权限" required>
              <Checkbox.Group
                value={addPermissions}
                onChange={setAddPermissions}
              >
                {customPermissions.map(perm => (
                  <Checkbox key={perm.value} value={perm.value} style={{ marginBottom: 4 }}>
                    {perm.label}
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 账号密码显示弹窗 */}
      <Modal
        title="子账户创建成功"
        open={showCredentials}
        onCancel={() => setShowCredentials(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setShowCredentials(false)}>
            我已保存，关闭
          </Button>
        ]}
        width={500}
      >
        <Alert
          message="请立即保存以下账号信息，密码仅显示一次！"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: '#666', marginBottom: 4 }}>登录账号</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text code style={{ fontSize: 16 }}>{credentials.userId}</Text>
              <Button 
                size="small" 
                icon={<CopyOutlined />} 
                onClick={() => copyToClipboard(credentials.userId)}
              >
                复制
              </Button>
            </div>
          </div>
          <div>
            <div style={{ color: '#666', marginBottom: 4 }}>登录密码</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text code style={{ fontSize: 16 }}>{credentials.password}</Text>
              <Button 
                size="small" 
                icon={<CopyOutlined />} 
                onClick={() => copyToClipboard(credentials.password)}
              >
                复制
              </Button>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, color: '#999', fontSize: 12 }}>
          提示：子账户可在登录页面使用上述账号密码登录
        </div>
      </Modal>

      {/* 编辑成员弹窗 */}
      <Modal
        title="编辑子账户"
        open={showEditMember}
        onCancel={() => setShowEditMember(false)}
        onOk={saveMember}
        confirmLoading={editLoading}
        width={500}
      >
        {editFormData && (
          <Form layout="horizontal" labelCol={{ span: 6 }}>
            <Form.Item label="账号">
              <Text code>{editFormData.user_id}</Text>
            </Form.Item>
            <Form.Item label="显示名称">
              <Input
                value={editFormData.displayName}
                onChange={(e) => setEditFormData({ ...editFormData, displayName: e.target.value })}
                placeholder="用于标识该账号"
              />
            </Form.Item>
            <Form.Item label="权限类型">
              <Radio.Group
                value={editFormData.permType}
                onChange={(e) => {
                  setEditFormData({
                    ...editFormData,
                    permType: e.target.value,
                    permissions: e.target.value === 'admin' ? [] : editFormData.permissions
                  })
                }}
              >
                <Radio value="admin">管理员（全部权限）</Radio>
                <Radio value="custom">自定义权限</Radio>
              </Radio.Group>
            </Form.Item>
            {editFormData.permType === 'custom' && (
              <Form.Item label="选择权限">
                <Checkbox.Group
                  value={editFormData.permissions}
                  onChange={(v) => setEditFormData({ ...editFormData, permissions: v })}
                >
                  {customPermissions.map(perm => (
                    <Checkbox key={perm.value} value={perm.value} style={{ marginBottom: 4 }}>
                      {perm.label}
                    </Checkbox>
                  ))}
                </Checkbox.Group>
              </Form.Item>
            )}
            <Form.Item label="状态">
              <Switch
                checked={editFormData.status === 1}
                onChange={(v) => setEditFormData({ ...editFormData, status: v ? 1 : 0 })}
                checkedChildren="启用"
                unCheckedChildren="禁用"
              />
            </Form.Item>
            <Form.Item label="重置密码">
              <Button icon={<ReloadOutlined />} onClick={resetPassword}>
                重置为随机密码
              </Button>
              {newPassword && (
                <div style={{ marginTop: 8 }}>
                  <Text type="success">新密码：</Text>
                  <Text code copyable>{newPassword}</Text>
                </div>
              )}
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

export default RAM

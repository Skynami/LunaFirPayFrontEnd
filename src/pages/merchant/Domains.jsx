import { useState, useEffect } from 'react'
import { Card, Table, Button, Modal, Form, Input, message, Tag, Space, Popconfirm, Alert } from 'antd'
import { PlusOutlined, DeleteOutlined, GlobalOutlined } from '@ant-design/icons'
import { useUserStore } from '../../stores/userStore'
import api from '../../utils/api'
import { formatTime } from '../../utils/time'

function Domains() {
  const { isRam } = useUserStore()
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(false)
  const [addModal, setAddModal] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [form] = Form.useForm()

  const fetchDomains = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/merchant/domains')
      if (res.data.code === 0) {
        setDomains(res.data.data)
      } else {
        message.error(res.data.msg || '获取域名列表失败')
      }
    } catch (error) {
      console.error('获取域名列表失败:', error)
      message.error('获取域名列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDomains()
  }, [])

  const getStatusTag = (status) => {
    const map = {
      pending: { color: 'processing', text: '审核中' },
      approved: { color: 'success', text: '已通过' },
      rejected: { color: 'error', text: '已拒绝' }
    }
    const v = map[status] || { color: 'default', text: status }
    return <Tag color={v.color}>{v.text}</Tag>
  }

  const handleAdd = async (values) => {
    setAddLoading(true)
    try {
      const res = await api.post('/api/merchant/domains/add', values)
      if (res.data.code === 0) {
        message.success('域名提交成功，等待审核')
        setAddModal(false)
        form.resetFields()
        fetchDomains()
      } else {
        message.error(res.data.msg || '提交失败')
      }
    } catch (error) {
      console.error('提交域名失败:', error)
      message.error('提交域名失败')
    } finally {
      setAddLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      const res = await api.post('/api/merchant/domains/delete', { id })
      if (res.data.code === 0) {
        message.success('域名已删除')
        fetchDomains()
      } else {
        message.error(res.data.msg || '删除失败')
      }
    } catch (error) {
      console.error('删除域名失败:', error)
      message.error('删除域名失败')
    }
  }

  const columns = [
    {
      title: '域名',
      dataIndex: 'domain',
      key: 'domain',
      render: (text) => (
        <Space>
          <GlobalOutlined />
          <span style={{ fontFamily: 'monospace' }}>{text}</span>
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status)
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text) => formatTime(text)
    },
    {
      title: '审核时间',
      dataIndex: 'reviewed_at',
      key: 'reviewed_at',
      width: 180,
      render: (text) => text ? formatTime(text) : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        record.status !== 'approved' ? (
          <Popconfirm
            title="确定删除此域名？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        ) : null
      )
    }
  ]

  return (
    <div>
      <Card
        title="域名白名单"
        extra={
          !isRam && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModal(true)}>
              添加域名
            </Button>
          )
        }
      >
        <Alert
          message="域名白名单说明"
          description={
            <div>
              <p>• 回调通知地址（notify_url）的域名需要在白名单中才能正常接收支付回调</p>
              <p>• 添加域名后需要等待管理员审核通过后才能使用</p>
              <p>• 支持泛域名匹配，例如添加 *.example.com 可匹配所有 example.com 的子域名</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={domains}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title="添加域名"
        open={addModal}
        onCancel={() => {
          setAddModal(false)
          form.resetFields()
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item
            name="domain"
            label="域名"
            rules={[
              { required: true, message: '请输入域名' },
              { 
                pattern: /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
                message: '请输入有效的域名格式'
              }
            ]}
            extra="请输入不带协议的域名，如：example.com 或 api.example.com"
          >
            <Input placeholder="example.com" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setAddModal(false)
                form.resetFields()
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={addLoading}>
                提交审核
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Domains

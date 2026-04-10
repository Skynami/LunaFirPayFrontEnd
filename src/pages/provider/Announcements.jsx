import { useEffect, useState } from 'react'
import { Button, Card, Form, Input, InputNumber, message, Modal, Popconfirm, Space, Switch, Table, Tag } from 'antd'
import { ArrowDownOutlined, ArrowUpOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import api from '../../utils/api'

function Announcements() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [list, setList] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const fetchList = async (page = pagination.page, pageSize = pagination.pageSize) => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/announcements', {
        params: { page, pageSize }
      })
      if (res.data.code === 0) {
        setList(res.data.data.list || [])
        setPagination({
          page: res.data.data.page,
          pageSize: res.data.data.pageSize,
          total: res.data.data.total || 0
        })
      } else {
        message.error(res.data.msg || '获取公告失败')
      }
    } catch (error) {
      message.error('获取公告失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      title: '',
      content: '',
      sort_order: 0,
      is_enabled: true
    })
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    form.setFieldsValue({
      title: row.title,
      content: row.content,
      sort_order: row.sort_order,
      is_enabled: row.is_enabled === 1
    })
    setModalOpen(true)
  }

  const saveAnnouncement = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      const payload = {
        title: values.title,
        content: values.content,
        sort_order: values.sort_order,
        is_enabled: values.is_enabled ? 1 : 0
      }

      const res = editing
        ? await api.put(`/api/admin/announcements/${editing.id}`, payload)
        : await api.post('/api/admin/announcements', payload)

      if (res.data.code === 0) {
        message.success(editing ? '更新成功' : '创建成功')
        setModalOpen(false)
        fetchList()
      } else {
        message.error(res.data.msg || '保存失败')
      }
    } catch (error) {
      if (error?.errorFields) return
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const updateEnabled = async (row, enabled) => {
    try {
      const res = await api.put(`/api/admin/announcements/${row.id}`, { is_enabled: enabled ? 1 : 0 })
      if (res.data.code === 0) {
        message.success('状态已更新')
        fetchList()
      } else {
        message.error(res.data.msg || '更新状态失败')
      }
    } catch (error) {
      message.error('更新状态失败')
    }
  }

  const movePriority = async (row, action) => {
    try {
      const res = await api.post(`/api/admin/announcements/${row.id}/move`, { action })
      if (res.data.code === 0) {
        fetchList()
      } else {
        message.error(res.data.msg || '移动失败')
      }
    } catch (error) {
      message.error('移动失败')
    }
  }

  const removeAnnouncement = async (row) => {
    try {
      const res = await api.delete(`/api/admin/announcements/${row.id}`)
      if (res.data.code === 0) {
        message.success('删除成功')
        fetchList()
      } else {
        message.error(res.data.msg || '删除失败')
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80
    },
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true
    },
    {
      title: '内容',
      dataIndex: 'content',
      ellipsis: true
    },
    {
      title: '优先级',
      dataIndex: 'sort_order',
      width: 100
    },
    {
      title: '状态',
      dataIndex: 'is_enabled',
      width: 120,
      render: (_, row) => (
        <Switch
          checked={row.is_enabled === 1}
          checkedChildren="显示"
          unCheckedChildren="隐藏"
          onChange={(checked) => updateEnabled(row, checked)}
        />
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180
    },
    {
      title: '操作',
      width: 240,
      render: (_, row) => (
        <Space wrap>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>
            编辑
          </Button>
          <Button size="small" icon={<ArrowUpOutlined />} onClick={() => movePriority(row, 'up')}>
            上移
          </Button>
          <Button size="small" icon={<ArrowDownOutlined />} onClick={() => movePriority(row, 'down')}>
            下移
          </Button>
          <Popconfirm title="确认删除该公告？" onConfirm={() => removeAnnouncement(row)}>
            <Button size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <h2 className="page-title">公告管理</h2>

      <Card
        title={<Space><Tag color="blue">商户中心公告</Tag><span>可按优先级排序并开启/关闭显示</span></Space>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增公告
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={list}
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            onChange: (page, pageSize) => fetchList(page, pageSize)
          }}
        />
      </Card>

      <Modal
        title={editing ? '编辑公告' : '新增公告'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={saveAnnouncement}
        confirmLoading={saving}
        width={720}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="公告标题" name="title" rules={[{ required: true, message: '请输入公告标题' }]}>
            <Input maxLength={200} placeholder="例如：结算系统维护通知" />
          </Form.Item>

          <Form.Item label="公告内容" name="content" rules={[{ required: true, message: '请输入公告内容' }]}>
            <Input.TextArea rows={6} maxLength={5000} placeholder="支持换行，建议写明生效时间、影响范围和处理建议" />
          </Form.Item>

          <Space size={16} style={{ width: '100%' }}>
            <Form.Item label="优先级" name="sort_order" style={{ width: 180 }}>
              <InputNumber style={{ width: '100%' }} precision={0} />
            </Form.Item>

            <Form.Item label="是否显示" name="is_enabled" valuePropName="checked" style={{ width: 180 }}>
              <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  )
}

export default Announcements

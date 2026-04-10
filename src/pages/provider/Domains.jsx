import { useState, useEffect } from 'react'
import { Card, Table, Button, Modal, Form, Input, message, Tag, Space, Select, Pagination, Row, Col } from 'antd'
import { CheckOutlined, CloseOutlined, DeleteOutlined, GlobalOutlined, SearchOutlined } from '@ant-design/icons'
import api from '../../utils/api'
import { formatTime } from '../../utils/time'

const { Option } = Select

function Domains() {
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState('')
  const [merchantFilter, setMerchantFilter] = useState('')
  
  // 审核弹窗
  const [rejectModal, setRejectModal] = useState(false)
  const [currentDomain, setCurrentDomain] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchDomains = async () => {
    setLoading(true)
    try {
      const params = { page, pageSize }
      if (statusFilter) params.status = statusFilter
      if (merchantFilter) params.merchant_id = merchantFilter
      
      const res = await api.get('/api/admin/domains', { params })
      if (res.data.code === 0) {
        setDomains(res.data.data.list)
        setTotal(res.data.data.total)
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
  }, [page, pageSize, statusFilter, merchantFilter])

  const getStatusTag = (status) => {
    const map = {
      pending: { color: 'processing', text: '待审核' },
      approved: { color: 'success', text: '已通过' },
      rejected: { color: 'error', text: '已拒绝' }
    }
    const v = map[status] || { color: 'default', text: status }
    return <Tag color={v.color}>{v.text}</Tag>
  }

  const handleApprove = async (record) => {
    setActionLoading(true)
    try {
      const res = await api.post('/api/admin/domains/approve', { id: record.id })
      if (res.data.code === 0) {
        message.success('审核通过')
        fetchDomains()
      } else {
        message.error(res.data.msg || '操作失败')
      }
    } catch (error) {
      console.error('审核失败:', error)
      message.error('操作失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectNote.trim()) {
      message.error('请输入拒绝原因')
      return
    }
    setActionLoading(true)
    try {
      const res = await api.post('/api/admin/domains/reject', { 
        id: currentDomain.id,
        note: rejectNote 
      })
      if (res.data.code === 0) {
        message.success('已拒绝')
        setRejectModal(false)
        setRejectNote('')
        setCurrentDomain(null)
        fetchDomains()
      } else {
        message.error(res.data.msg || '操作失败')
      }
    } catch (error) {
      console.error('拒绝失败:', error)
      message.error('操作失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (record) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除域名 ${record.domain} 吗？`,
      onOk: async () => {
        try {
          const res = await api.post('/api/admin/domains/delete', { id: record.id })
          if (res.data.code === 0) {
            message.success('删除成功')
            fetchDomains()
          } else {
            message.error(res.data.msg || '删除失败')
          }
        } catch (error) {
          console.error('删除失败:', error)
          message.error('删除失败')
        }
      }
    })
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 50
    },
    {
      title: '商户',
      key: 'merchant',
      width: 120,
      render: (_, record) => (
        <div>
          <div style={{ fontSize: 13 }}>{record.merchant_name || record.username}</div>
          <div style={{ fontSize: 11, color: '#999' }}>{record.merchant_id}</div>
        </div>
      )
    },
    {
      title: '域名',
      dataIndex: 'domain',
      key: 'domain',
      width: 200,
      render: (text) => (
        <Space size={4}>
          <GlobalOutlined style={{ fontSize: 12 }} />
          <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{text}</span>
        </Space>
      ),
      sorter: (a, b) => {
        // 绝对域名（不以*开头）优先
        const aIsWildcard = a.domain.startsWith('*')
        const bIsWildcard = b.domain.startsWith('*')
        if (aIsWildcard !== bIsWildcard) return aIsWildcard ? 1 : -1
        return a.domain.localeCompare(b.domain)
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => getStatusTag(status),
      sorter: (a, b) => {
        // approved > pending > rejected
        const order = { approved: 0, pending: 1, rejected: 2 }
        return (order[a.status] ?? 3) - (order[b.status] ?? 3)
      },
      defaultSortOrder: 'ascend'
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (text) => formatTime(text)
    },
    {
      title: '审核时间',
      dataIndex: 'reviewed_at',
      key: 'reviewed_at',
      width: 140,
      render: (text) => text ? formatTime(text) : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Space size={0}>
          {record.status === 'pending' && (
            <>
              <Button 
                type="link" 
                size="small"
                icon={<CheckOutlined />} 
                onClick={() => handleApprove(record)}
                loading={actionLoading}
              >
                通过
              </Button>
              <Button 
                type="link" 
                size="small"
                danger 
                icon={<CloseOutlined />}
                onClick={() => {
                  setCurrentDomain(record)
                  setRejectModal(true)
                }}
              >
                拒绝
              </Button>
            </>
          )}
          <Button 
            type="link" 
            size="small"
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      <Card title="域名白名单审核">
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col>
            <Select
              placeholder="状态筛选"
              allowClear
              style={{ width: 150 }}
              value={statusFilter || undefined}
              onChange={(val) => {
                setStatusFilter(val || '')
                setPage(1)
              }}
            >
              <Option value="pending">待审核</Option>
              <Option value="approved">已通过</Option>
              <Option value="rejected">已拒绝</Option>
            </Select>
          </Col>
          <Col>
            <Input
              placeholder="商户ID"
              allowClear
              style={{ width: 150 }}
              value={merchantFilter}
              onChange={(e) => {
                setMerchantFilter(e.target.value)
              }}
              onPressEnter={() => {
                setPage(1)
                fetchDomains()
              }}
              suffix={<SearchOutlined style={{ color: '#999' }} />}
            />
          </Col>
          <Col>
            <Button onClick={() => {
              setPage(1)
              fetchDomains()
            }}>
              搜索
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={domains}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
        
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger
            showQuickJumper
            showTotal={(total) => `共 ${total} 条`}
            onChange={(p, ps) => {
              setPage(p)
              setPageSize(ps)
            }}
          />
        </div>
      </Card>

      <Modal
        title="拒绝域名"
        open={rejectModal}
        onCancel={() => {
          setRejectModal(false)
          setRejectNote('')
          setCurrentDomain(null)
        }}
        onOk={handleReject}
        confirmLoading={actionLoading}
        okText="确认拒绝"
        okButtonProps={{ danger: true }}
      >
        <div style={{ marginBottom: 16 }}>
          域名: <strong>{currentDomain?.domain}</strong>
        </div>
        <Input.TextArea
          placeholder="请输入拒绝原因"
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          rows={3}
        />
      </Modal>
    </div>
  )
}

export default Domains

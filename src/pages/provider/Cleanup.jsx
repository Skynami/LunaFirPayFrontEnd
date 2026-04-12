import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Input,
  InputNumber,
  message,
  Modal,
  Radio,
  Row,
  Space,
  Switch,
  Table,
  Tag,
  TimePicker,
  Typography
} from 'antd'
import { CalendarOutlined, DeleteOutlined, EyeOutlined, SaveOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../../utils/api'
import { formatTime } from '../../utils/time'

const { Text } = Typography
const { RangePicker } = DatePicker

const STATUS_OPTIONS = [
  { label: '支付成功', value: 1 },
  { label: '未支付', value: 0 },
  { label: '已退款', value: 4 }
]

function normalizeRetentionDays(value, fallback = 0, min = 0) {
  if (value === null || value === undefined || value === '') return fallback
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.floor(n))
}

function Cleanup() {
  const [merchantLoading, setMerchantLoading] = useState(false)
  const [merchants, setMerchants] = useState([])
  const [merchantTotal, setMerchantTotal] = useState(0)
  const [merchantPage, setMerchantPage] = useState(1)
  const [merchantKeyword, setMerchantKeyword] = useState('')

  const [selectAllMerchants, setSelectAllMerchants] = useState(false)
  const [selectedMerchantIds, setSelectedMerchantIds] = useState([])

  const [cleanupSettlementCompleted, setCleanupSettlementCompleted] = useState(false)
  const [cleanupSettlementUnfinished, setCleanupSettlementUnfinished] = useState(false)
  const [cleanupTestOrders, setCleanupTestOrders] = useState(false)
  const [cleanupUnnotifiedPaid, setCleanupUnnotifiedPaid] = useState(false)
  const [orderStatuses, setOrderStatuses] = useState([])
  const [cleanupRetentionDays, setCleanupRetentionDays] = useState(30)

  const [scheduleCleanupSettlementCompleted, setScheduleCleanupSettlementCompleted] = useState(false)
  const [scheduleCleanupSettlementUnfinished, setScheduleCleanupSettlementUnfinished] = useState(false)
  const [scheduleCleanupTestOrders, setScheduleCleanupTestOrders] = useState(false)
  const [scheduleOrderStatuses, setScheduleOrderStatuses] = useState([])
  const [scheduleCleanupRetentionDays, setScheduleCleanupRetentionDays] = useState(30)

  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleTime, setScheduleTime] = useState(dayjs('02:00', 'HH:mm'))

  const [manualMode, setManualMode] = useState('days')
  const [manualDateRange, setManualDateRange] = useState(null)

  const [savingConfig, setSavingConfig] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [runLoading, setRunLoading] = useState(false)
  const [previewData, setPreviewData] = useState(null)

  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)

  const merchantScopeLabel = useMemo(() => {
    if (selectAllMerchants) return '全部商户'
    return `已选 ${selectedMerchantIds.length} 个商户`
  }, [selectAllMerchants, selectedMerchantIds])

  const fetchMerchants = async (page = merchantPage, keyword = merchantKeyword) => {
    setMerchantLoading(true)
    try {
      const res = await api.get('/api/admin/cleanup/merchants', {
        params: { page, pageSize: 20, keyword }
      })
      if (res.data.code === 0) {
        setMerchants(res.data.data.list || [])
        setMerchantTotal(res.data.data.total || 0)
        setMerchantPage(page)
      } else {
        message.error(res.data.msg || '获取商户列表失败')
      }
    } catch (error) {
      message.error('获取商户列表失败')
    } finally {
      setMerchantLoading(false)
    }
  }

  const fetchConfig = async () => {
    try {
      const res = await api.get('/api/admin/cleanup/config')
      if (res.data.code !== 0) {
        message.error(res.data.msg || '获取定时配置失败')
        return
      }

      const cfg = res.data.data || {}
      const settlementScopes = Array.isArray(cfg.cleanup_settlement_statuses)
        ? cfg.cleanup_settlement_statuses
        : (cfg.cleanup_settlements ? ['completed'] : [])
      setScheduleEnabled(!!cfg.enabled)
      setScheduleTime(dayjs(cfg.run_time || '02:00', 'HH:mm'))
      // 手动清理与定时清理保持独立，加载定时配置时不覆盖手动选项
      setScheduleCleanupSettlementCompleted(settlementScopes.includes('completed'))
      setScheduleCleanupSettlementUnfinished(settlementScopes.includes('unfinished'))
      setScheduleCleanupTestOrders(!!cfg.cleanup_test_orders)
      setScheduleOrderStatuses(Array.isArray(cfg.order_statuses) ? cfg.order_statuses : [])
      setScheduleCleanupRetentionDays(normalizeRetentionDays(cfg.cleanup_retention_days, 30, 1))
    } catch (error) {
      message.error('获取定时配置失败')
    }
  }

  const fetchLogs = async () => {
    setLogsLoading(true)
    try {
      const res = await api.get('/api/admin/cleanup/logs')
      if (res.data.code === 0) {
        setLogs(res.data.data.list || [])
      } else {
        message.error(res.data.msg || '获取清理日志失败')
      }
    } catch (error) {
      message.error('获取清理日志失败')
    } finally {
      setLogsLoading(false)
    }
  }

  const validateCleanupOptions = ({ statuses, settlementStatuses, testOrders, unnotifiedPaid, retentionDays, requireMerchant = true, minRetentionDays = 0 }) => {
    if (requireMerchant && !selectAllMerchants && selectedMerchantIds.length === 0) {
      message.warning('请至少选择一个商户，或勾选全部商户')
      return false
    }

    if (statuses.length === 0 && settlementStatuses.length === 0 && !testOrders && !unnotifiedPaid) {
      message.warning('请至少选择一种清理操作')
      return false
    }

    if (!Number.isFinite(retentionDays) || retentionDays < minRetentionDays) {
      message.warning(`删除天数必须大于等于 ${minRetentionDays}`)
      return false
    }

    return true
  }

  const buildPayload = ({ includeSchedule = true, includeRange = false, statuses, settlementStatuses, testOrders, unnotifiedPaid, retentionDays } = {}) => {
    const cleanupOrders = (statuses || []).length > 0 || !!unnotifiedPaid
    const cleanupSettlementStatuses = [...new Set(settlementStatuses || [])]

    const payload = {
      merchant_scope: selectAllMerchants ? 'all' : 'ids',
      merchant_ids: selectAllMerchants ? [] : selectedMerchantIds,
      cleanup_orders: cleanupOrders,
      order_statuses: cleanupOrders ? statuses : [],
      cleanup_settlements: cleanupSettlementStatuses.length > 0,
      cleanup_settlement_statuses: cleanupSettlementStatuses,
      cleanup_test_orders: !!testOrders,
      cleanup_unnotified_paid: !!unnotifiedPaid,
      cleanup_retention_days: retentionDays
    }

    if (includeSchedule) {
      payload.enabled = scheduleEnabled
      payload.run_time = scheduleTime.format('HH:mm')
    }

    if (includeRange && manualMode === 'range') {
      payload.start_date = manualDateRange?.[0]?.format('YYYY-MM-DD') || ''
      payload.end_date = manualDateRange?.[1]?.format('YYYY-MM-DD') || ''
    }

    return payload
  }

  const saveConfig = async () => {
    const scheduleSettlementStatuses = [
      scheduleCleanupSettlementCompleted ? 'completed' : null,
      scheduleCleanupSettlementUnfinished ? 'unfinished' : null
    ].filter(Boolean)

    if (!validateCleanupOptions({
      statuses: scheduleOrderStatuses,
      settlementStatuses: scheduleSettlementStatuses,
      testOrders: scheduleCleanupTestOrders,
      unnotifiedPaid: false,
      retentionDays: scheduleCleanupRetentionDays,
      minRetentionDays: 1,
      requireMerchant: false
    })) return

    setSavingConfig(true)
    try {
      const payload = buildPayload({
        includeSchedule: true,
        includeRange: false,
        statuses: scheduleOrderStatuses,
        settlementStatuses: scheduleSettlementStatuses,
        testOrders: scheduleCleanupTestOrders,
        unnotifiedPaid: false,
        retentionDays: scheduleCleanupRetentionDays
      })
      // 定时清理固定全商户执行，不受手动选择商户影响
      payload.merchant_scope = 'all'
      payload.merchant_ids = []
      const res = await api.post('/api/admin/cleanup/config', payload)
      if (res.data.code === 0) {
        message.success('定时清理设置已保存')
        fetchConfig()
      } else {
        message.error(res.data.msg || '保存失败')
      }
    } catch (error) {
      message.error('保存失败')
    } finally {
      setSavingConfig(false)
    }
  }

  const runPreview = async () => {
    const manualSettlementStatuses = [
      cleanupSettlementCompleted ? 'completed' : null,
      cleanupSettlementUnfinished ? 'unfinished' : null
    ].filter(Boolean)

    if (!validateCleanupOptions({
      statuses: orderStatuses,
      settlementStatuses: manualSettlementStatuses,
      testOrders: cleanupTestOrders,
      unnotifiedPaid: cleanupUnnotifiedPaid,
      retentionDays: cleanupRetentionDays,
      minRetentionDays: 0
    })) return

    if (manualMode === 'range' && (!manualDateRange || manualDateRange.length !== 2)) {
      message.warning('请选择完整日期区间')
      return
    }

    setPreviewLoading(true)
    try {
      const payload = buildPayload({
        includeSchedule: false,
        includeRange: true,
        statuses: orderStatuses,
        settlementStatuses: manualSettlementStatuses,
        testOrders: cleanupTestOrders,
        unnotifiedPaid: cleanupUnnotifiedPaid,
        retentionDays: cleanupRetentionDays
      })
      const res = await api.post('/api/admin/cleanup/preview', payload)
      if (res.data.code === 0) {
        setPreviewData(res.data.data)
      } else {
        message.error(res.data.msg || '预估失败')
      }
    } catch (error) {
      message.error('预估失败')
    } finally {
      setPreviewLoading(false)
    }
  }

  const runCleanup = async () => {
    const manualSettlementStatuses = [
      cleanupSettlementCompleted ? 'completed' : null,
      cleanupSettlementUnfinished ? 'unfinished' : null
    ].filter(Boolean)

    if (!validateCleanupOptions({
      statuses: orderStatuses,
      settlementStatuses: manualSettlementStatuses,
      testOrders: cleanupTestOrders,
      unnotifiedPaid: cleanupUnnotifiedPaid,
      retentionDays: cleanupRetentionDays,
      minRetentionDays: 0
    })) return

    if (manualMode === 'range' && (!manualDateRange || manualDateRange.length !== 2)) {
      message.warning('请选择完整日期区间')
      return
    }

    Modal.confirm({
      title: '确认执行清理？',
      content: '该操作会直接删除记录，无法恢复。',
      okText: '确认执行',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setRunLoading(true)
        try {
          const payload = {
            ...buildPayload({
              includeSchedule: false,
              includeRange: true,
              statuses: orderStatuses,
              settlementStatuses: manualSettlementStatuses,
              testOrders: cleanupTestOrders,
              unnotifiedPaid: cleanupUnnotifiedPaid,
              retentionDays: cleanupRetentionDays
            }),
            trigger_type: 'manual',
            operator_id: 'provider'
          }

          const executeRun = async () => {
            const runRes = await api.post('/api/admin/cleanup/run', payload)
            if (runRes.data.code === 0) {
              const info = runRes.data.data || {}
              message.success(`执行完成：订单 ${info.ordersAffected || 0} 条，结算 ${info.settlementsAffected || 0} 条`)
              fetchLogs()
              runPreview()
            } else {
              message.error(runRes.data.msg || '执行失败')
            }
          }

          // 手动清理时，若“已支付未回调”有命中数据，追加风险确认
          if (cleanupUnnotifiedPaid) {
            const previewRes = await api.post('/api/admin/cleanup/preview', payload)
            const unnotifiedCount = Number(previewRes?.data?.data?.preview_breakdown?.unnotified_paid || 0)
            if (previewRes?.data?.code === 0 && unnotifiedCount > 0) {
              Modal.confirm({
                title: '检测到已支付未回调数据',
                content: `当前将清理 ${unnotifiedCount} 条“已支付未回调”订单，可能影响后续补发回调，是否继续？`,
                okText: '继续清理',
                okType: 'danger',
                cancelText: '取消',
                onOk: executeRun,
                onCancel: () => setRunLoading(false)
              })
              return
            }
          }

          await executeRun()
        } catch (error) {
          message.error('执行失败')
        } finally {
          setRunLoading(false)
        }
      }
    })
  }

  useEffect(() => {
    fetchConfig()
    fetchMerchants(1)
    fetchLogs()
  }, [])

  const merchantColumns = [
    {
      title: '商户号',
      dataIndex: 'merchant_no',
      width: 120
    },
    {
      title: '商户名称',
      dataIndex: 'merchant_name'
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value) => {
        if (value === 'active' || value === 'approved') return <Tag color="success">正常</Tag>
        if (value === 'pending') return <Tag color="orange">待审核</Tag>
        return <Tag>{value || '-'}</Tag>
      }
    }
  ]

  const logColumns = [
    { title: '时间', dataIndex: 'executed_at', width: 180, render: (v) => formatTime(v) },
    {
      title: '触发方式',
      dataIndex: 'trigger_type',
      width: 100,
      render: (v) => (v === 'schedule' ? <Tag color="blue">定时</Tag> : <Tag color="green">手动</Tag>)
    },
    {
      title: '范围',
      dataIndex: 'merchant_scope',
      width: 120,
      render: (v, row) => (v === 'all' ? '全部商户' : `${row.merchant_count || 0} 个商户`)
    },
    {
      title: '清理结果',
      render: (_, row) => `订单 ${row.orders_affected || 0} / 结算 ${row.settlements_affected || 0}`
    },
    {
      title: '状态',
      dataIndex: 'success',
      width: 100,
      render: (v) => (v === 1 ? <Tag color="success">成功</Tag> : <Tag color="red">失败</Tag>)
    },
    { title: '错误信息', dataIndex: 'error_message', ellipsis: true }
  ]

  return (
    <div>
      <h2 className="page-title">清理记录</h2>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={16}>
            <Space wrap>
              <Text strong>清理哪些记录</Text>
              <Checkbox
                checked={cleanupSettlementCompleted}
                onChange={(e) => setCleanupSettlementCompleted(e.target.checked)}
              >
                已完成结算记录
              </Checkbox>
              <Checkbox
                checked={cleanupSettlementUnfinished}
                onChange={(e) => setCleanupSettlementUnfinished(e.target.checked)}
              >
                未完成结算记录
              </Checkbox>
              <Checkbox
                checked={cleanupTestOrders}
                onChange={(e) => setCleanupTestOrders(e.target.checked)}
              >
                测试支付数据
              </Checkbox>
              <Checkbox
                checked={cleanupUnnotifiedPaid}
                onChange={(e) => setCleanupUnnotifiedPaid(e.target.checked)}
              >
                已支付未回调
              </Checkbox>
              {STATUS_OPTIONS.map((item) => (
                <Checkbox
                  key={item.value}
                  checked={orderStatuses.includes(item.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setOrderStatuses([...new Set([...orderStatuses, item.value])])
                    } else {
                      setOrderStatuses(orderStatuses.filter((v) => v !== item.value))
                    }
                  }}
                >
                  {item.label}
                </Checkbox>
              ))}
            </Space>
          </Col>

          <Col xs={24} md={8}>
            <Space wrap style={{ justifyContent: 'flex-end', width: '100%' }}>
              <Button icon={<EyeOutlined />} onClick={runPreview} loading={previewLoading}>预估影响</Button>
              <Button type="primary" danger icon={<DeleteOutlined />} onClick={runCleanup} loading={runLoading}>立即清理</Button>
            </Space>
          </Col>
        </Row>

        <Row gutter={[12, 12]} style={{ marginTop: 10 }}>
          <Col xs={24} md={24}>
            <Space wrap>
              <Radio.Group value={manualMode} onChange={(e) => setManualMode(e.target.value)}>
                <Radio value="days">按天数执行</Radio>
                <Radio value="range">按日期区间执行</Radio>
              </Radio.Group>
              {manualMode === 'days' ? (
                <Space>
                  <Text>删除天数之前（0=此刻往前，其他按 0 点分割）</Text>
                  <InputNumber
                    min={0}
                    value={cleanupRetentionDays}
                    onChange={(v) => setCleanupRetentionDays(normalizeRetentionDays(v, 0))}
                    onBlur={() => setCleanupRetentionDays((prev) => normalizeRetentionDays(prev, 0))}
                  />
                </Space>
              ) : (
                <RangePicker
                  value={manualDateRange}
                  onChange={(v) => setManualDateRange(v)}
                  allowClear
                  format="YYYY-MM-DD"
                />
              )}
            </Space>
          </Col>
        </Row>

        {previewData && (
          <div style={{ marginTop: 12 }}>
            <Tag color="blue">预估订单 {previewData.preview?.orders || 0} 条</Tag>
            <Tag color="purple">预估结算 {previewData.preview?.settlements || 0} 条</Tag>
            <Tag color="geekblue">总计 {previewData.preview?.total || 0} 条</Tag>
            <Tag>支付成功 {previewData.preview_breakdown?.paid_success || 0} 条</Tag>
            <Tag>未支付 {previewData.preview_breakdown?.unpaid || 0} 条</Tag>
            <Tag>已退款 {previewData.preview_breakdown?.refunded || 0} 条</Tag>
            <Tag>已支付未回调 {previewData.preview_breakdown?.unnotified_paid || 0} 条</Tag>
            <Tag>测试支付 {previewData.preview_breakdown?.test_orders || 0} 条</Tag>
            <Tag>已完成结算 {previewData.preview_breakdown?.settlements_completed || 0} 条</Tag>
            <Tag>未完成结算 {previewData.preview_breakdown?.settlements_unfinished || 0} 条</Tag>
          </div>
        )}
      </Card>

      <Card title="选择商户（每页20条，可跨页选择）" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={24} md={12}>
            <Space wrap>
              <Input
                placeholder="搜索商户号"
                value={merchantKeyword}
                onChange={(e) => setMerchantKeyword(e.target.value)}
                style={{ width: 240 }}
              />
              <Button onClick={() => fetchMerchants(1, merchantKeyword)}>查询</Button>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Space wrap style={{ justifyContent: 'flex-end', width: '100%' }}>
              <Checkbox
                checked={selectAllMerchants}
                onChange={(e) => {
                  const checked = e.target.checked
                  setSelectAllMerchants(checked)
                  if (checked) setSelectedMerchantIds([])
                }}
              >
                全部选中
              </Checkbox>
              <Tag color={selectAllMerchants ? 'blue' : 'default'}>{merchantScopeLabel}</Tag>
            </Space>
          </Col>
        </Row>

        <Table
          rowKey="merchant_no"
          loading={merchantLoading}
          dataSource={merchants}
          columns={merchantColumns}
          rowSelection={{
            selectedRowKeys: selectedMerchantIds,
            preserveSelectedRowKeys: true,
            onChange: (keys) => {
              const normalized = keys.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0)
              setSelectedMerchantIds(normalized)
              if (normalized.length > 0) setSelectAllMerchants(false)
            },
            getCheckboxProps: () => ({ disabled: selectAllMerchants })
          }}
          pagination={{
            current: merchantPage,
            pageSize: 20,
            total: merchantTotal,
            onChange: (page) => fetchMerchants(page)
          }}
        />
      </Card>

      <Card title="定时清理设置（每天执行）" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={8}>
            <Space>
              <Switch checked={scheduleEnabled} onChange={setScheduleEnabled} />
              <Text>启用定时清理</Text>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space>
              <CalendarOutlined />
              <Text>执行时间</Text>
              <TimePicker
                value={scheduleTime}
                format="HH:mm"
                onChange={(v) => setScheduleTime(v || dayjs('02:00', 'HH:mm'))}
                allowClear={false}
              />
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
              <Button icon={<SaveOutlined />} type="primary" onClick={saveConfig} loading={savingConfig}>保存设置</Button>
            </Space>
          </Col>
        </Row>

        <Row gutter={[12, 12]} style={{ marginTop: 10 }}>
          <Col xs={24} md={24}>
            <Space wrap>
              <Text strong>定时清理项</Text>
              <Checkbox
                checked={scheduleCleanupSettlementCompleted}
                onChange={(e) => setScheduleCleanupSettlementCompleted(e.target.checked)}
              >
                已完成结算记录
              </Checkbox>
              <Checkbox
                checked={scheduleCleanupSettlementUnfinished}
                onChange={(e) => setScheduleCleanupSettlementUnfinished(e.target.checked)}
              >
                未完成结算记录
              </Checkbox>
              <Checkbox
                checked={scheduleCleanupTestOrders}
                onChange={(e) => setScheduleCleanupTestOrders(e.target.checked)}
              >
                测试支付数据
              </Checkbox>
              {STATUS_OPTIONS.map((item) => (
                <Checkbox
                  key={`schedule-${item.value}`}
                  checked={scheduleOrderStatuses.includes(item.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setScheduleOrderStatuses([...new Set([...scheduleOrderStatuses, item.value])])
                    } else {
                      setScheduleOrderStatuses(scheduleOrderStatuses.filter((v) => v !== item.value))
                    }
                  }}
                >
                  {item.label}
                </Checkbox>
              ))}
            </Space>
          </Col>
        </Row>

        <Row gutter={[12, 12]} style={{ marginTop: 10 }}>
          <Col xs={24} md={24}>
            <Space>
              <Text>删除天数之前（按 0 点分割）</Text>
              <InputNumber
                min={1}
                value={scheduleCleanupRetentionDays}
                onChange={(v) => setScheduleCleanupRetentionDays(normalizeRetentionDays(v, 1, 1))}
                onBlur={() => setScheduleCleanupRetentionDays((prev) => normalizeRetentionDays(prev, 1, 1))}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      <Card title="清理执行日志（最近 3 条）">
        <Table
          rowKey="id"
          loading={logsLoading}
          dataSource={logs}
          columns={logColumns}
          pagination={false}
        />
      </Card>
    </div>
  )
}

export default Cleanup

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Button, Card, Form, InputNumber, Spin, Typography, message } from 'antd'
import { CheckCircleOutlined, ExperimentOutlined, ReloadOutlined } from '@ant-design/icons'
import api from '../utils/api'
import styles from './TestPay.module.css'

const { Title, Paragraph } = Typography

const TEST_VISITOR_STORAGE_KEY = 'epay_test_pay_visitor_id'
const TEST_ORDER_CONTEXT_STORAGE_KEY = 'epay_test_pay_last_order_context'

const EMPTY_CONFIG = {
  enabled: false,
  reason: '',
  pay_group_id: null,
  pay_group_name: '',
  max_amount: 50000,
  auto_refund: false,
  pay_types: []
}

const CUSTOMER_REASON_MAP = {
  测试支付未开启: '当前支付测试暂未开放',
  测试支付未配置支付组: '当前支付测试暂不可用',
  测试支付组不存在: '当前支付测试暂不可用',
  测试支付组暂无可用通道: '当前暂无可用支付方式'
}

function formatUnavailableReason(reason) {
  if (!reason) {
    return '当前服务暂不可用，请稍后重试或联系平台客服。'
  }
  return CUSTOMER_REASON_MAP[reason] || '当前服务暂不可用，请稍后重试或联系平台客服。'
}

function generateVisitorSeed() {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID().replace(/-/g, '')
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 18)}`
}

function ensureTestVisitorId() {
  if (typeof window === 'undefined') {
    return `tpv_${generateVisitorSeed()}`
  }

  try {
    const cached = window.localStorage.getItem(TEST_VISITOR_STORAGE_KEY)
    if (cached && /^[A-Za-z0-9_-]{16,80}$/.test(cached)) {
      return cached
    }
  } catch (error) {
    // 忽略 localStorage 读取异常，走临时ID
  }

  const created = `tpv_${generateVisitorSeed()}`
  try {
    window.localStorage.setItem(TEST_VISITOR_STORAGE_KEY, created)
  } catch (error) {
    // 忽略 localStorage 写入异常
  }
  return created
}

function isValidTestVisitorId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{16,80}$/.test(value)
}

function isValidTradeNo(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(value)
}

function isValidVisitorSig(value) {
  return typeof value === 'string' && /^[A-Fa-f0-9]{64}$/.test(value)
}

function loadLastOrderContext() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(TEST_ORDER_CONTEXT_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw)
    const tradeNo = parsed?.trade_no
    const visitorId = parsed?.visitor_id
    const visitorSig = parsed?.visitor_sig
    if (!isValidTradeNo(tradeNo) || !isValidTestVisitorId(visitorId) || !isValidVisitorSig(visitorSig)) {
      return null
    }
    return {
      trade_no: tradeNo,
      visitor_id: visitorId,
      visitor_sig: visitorSig
    }
  } catch (error) {
    return null
  }
}

function persistLastOrderContext(context) {
  if (typeof window === 'undefined' || !context) {
    return
  }
  try {
    window.localStorage.setItem(TEST_ORDER_CONTEXT_STORAGE_KEY, JSON.stringify(context))
  } catch (error) {
    // 忽略 localStorage 写入异常
  }
}

function clearLastOrderContext() {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.removeItem(TEST_ORDER_CONTEXT_STORAGE_KEY)
  } catch (error) {
    // 忽略 localStorage 清理异常
  }
}

function TestPay() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [config, setConfig] = useState(EMPTY_CONFIG)
  const [money, setMoney] = useState(1)
  const [selectedType, setSelectedType] = useState('')
  const [statusCheck, setStatusCheck] = useState({ visible: false, loading: false, paid: false, refunded: false, refundFailed: false, message: '' })
  const [canceling, setCanceling] = useState(false)
  const [visitorId] = useState(() => ensureTestVisitorId())
  const [lastOrderContext, setLastOrderContext] = useState(() => loadLastOrderContext())

  const tradeNo = searchParams.get('trade_no')
  const queryVisitorId = searchParams.get('visitor_id')
  const queryVisitorSig = searchParams.get('visitor_sig')

  const effectiveTradeNo = tradeNo || lastOrderContext?.trade_no || ''
  const effectiveVisitorId = tradeNo
    ? (queryVisitorId || (lastOrderContext?.trade_no === tradeNo ? lastOrderContext?.visitor_id : visitorId))
    : (lastOrderContext?.visitor_id || visitorId)
  const effectiveVisitorSig = tradeNo
    ? (queryVisitorSig || (lastOrderContext?.trade_no === tradeNo ? lastOrderContext?.visitor_sig : ''))
    : (lastOrderContext?.visitor_sig || '')
  const hasOrderContext = !!effectiveTradeNo

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/pay/test/config')
      if (res.data.code !== 0) {
        setConfig(EMPTY_CONFIG)
        message.error(res.data.msg || '获取测试支付配置失败')
        return
      }

      const nextConfig = {
        ...EMPTY_CONFIG,
        ...(res.data.data || {})
      }

      setConfig(nextConfig)
      setSelectedType((prev) => {
        if (prev && nextConfig.pay_types.some((item) => item.type_code === prev)) {
          return prev
        }
        return nextConfig.pay_types[0]?.type_code || ''
      })
    } catch (error) {
      setConfig(EMPTY_CONFIG)
      message.error('获取测试支付配置失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  useEffect(() => {
    if (!isValidTradeNo(tradeNo) || !isValidTestVisitorId(queryVisitorId) || !isValidVisitorSig(queryVisitorSig)) {
      return
    }

    const fromQuery = {
      trade_no: tradeNo,
      visitor_id: queryVisitorId,
      visitor_sig: queryVisitorSig
    }
    persistLastOrderContext(fromQuery)
    setLastOrderContext(fromQuery)
  }, [tradeNo, queryVisitorId, queryVisitorSig])

  useEffect(() => {
    refreshOrderStatus(false)
  }, [effectiveTradeNo, effectiveVisitorId, effectiveVisitorSig])

  const refreshOrderStatus = async (showToast = true) => {
    if (!hasOrderContext) {
      const emptyOrderMsg = '当前没有可查询的测试订单，请先点击“立即前往收银台”创建订单'
      if (showToast) {
        setStatusCheck({ visible: true, loading: false, paid: false, refunded: false, refundFailed: false, message: emptyOrderMsg })
        message.info(emptyOrderMsg)
      } else {
        setStatusCheck({ visible: false, loading: false, paid: false, refunded: false, refundFailed: false, message: '' })
      }
      return
    }

    if (!isValidTestVisitorId(effectiveVisitorId) || !isValidVisitorSig(effectiveVisitorSig)) {
      const unavailableMsg = '缺少访客校验信息，请重新发起测试支付后再查询状态'
      setStatusCheck({ visible: true, loading: false, paid: false, refunded: false, refundFailed: false, message: unavailableMsg })
      if (showToast) {
        message.warning(unavailableMsg)
      }
      return
    }

    setStatusCheck({ visible: true, loading: true, paid: false, refunded: false, refundFailed: false, message: '' })

    try {
      const res = await api.get('/api/pay/check_status', {
        params: {
          trade_no: effectiveTradeNo,
          visitor_id: effectiveVisitorId,
          visitor_sig: effectiveVisitorSig
        }
      })

      const refunded = res.data.code === 0 && res.data.refunded === true
      const refundFailed = res.data.code === 0 && parseInt(res.data.refund_status || 0, 10) === 2
      const paid = res.data.code === 0 && (res.data.status === 1 || refunded)
      const refundFailReason = (res.data.refund_reason || '').trim()
      let resultMsg = ''
      if (res.data.code !== 0) {
        resultMsg = res.data.msg || '订单状态查询失败'
      } else if (refundFailed) {
        resultMsg = `支付成功，自动退款失败：${refundFailReason || '未知原因'}`
      }

      setStatusCheck({ visible: true, loading: false, paid, refunded, refundFailed, message: resultMsg })

      if (showToast) {
        if (res.data.code === 0) {
          message.success('订单状态已刷新')
        } else {
          message.warning(resultMsg)
        }
      }

      if (res.data.code === 0) {
        const latestContext = {
          trade_no: effectiveTradeNo,
          visitor_id: effectiveVisitorId,
          visitor_sig: effectiveVisitorSig
        }
        persistLastOrderContext(latestContext)
        setLastOrderContext(latestContext)
      }
    } catch (error) {
      const errorMsg = '查询订单状态失败，请稍后重试'
      setStatusCheck({ visible: true, loading: false, paid: false, refunded: false, refundFailed: false, message: errorMsg })
      if (showToast) {
        message.error(errorMsg)
      }
    }
  }

  const handleCreateOrder = async () => {
    if (!selectedType) {
      message.error('请选择支付方式')
      return
    }

    const moneyValue = Number(money)
    if (!Number.isFinite(moneyValue) || moneyValue <= 0) {
      message.error('请输入正确金额')
      return
    }

    const maxAmount = Number(config.max_amount || 50000)
    if (Number.isFinite(maxAmount) && moneyValue > maxAmount) {
      message.error(`金额不能超过 ${maxAmount.toFixed(2)} 元`)
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post('/api/pay/test/create', {
        money: moneyValue.toFixed(2),
        pay_type: selectedType,
        name: '支付测试',
        visitor_id: visitorId
      })

      if (res.data.code === 0 && res.data.data) {
        const createdTradeNo = res.data.data.trade_no
        const createdVisitorId = res.data.data.visitor_id || visitorId
        const createdVisitorSig = res.data.data.visitor_sig

        if (isValidTradeNo(createdTradeNo) && isValidTestVisitorId(createdVisitorId) && isValidVisitorSig(createdVisitorSig)) {
          const createdContext = {
            trade_no: createdTradeNo,
            visitor_id: createdVisitorId,
            visitor_sig: createdVisitorSig
          }
          persistLastOrderContext(createdContext)
          setLastOrderContext(createdContext)
        }

        if (res.data.data.cashier_url) {
          window.location.href = res.data.data.cashier_url
          return
        }

        message.error('支付入口获取失败，请重试')
      } else {
        message.error(res.data.msg || '创建测试订单失败')
      }
    } catch (error) {
      message.error('创建测试订单失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!hasOrderContext) {
      message.info('当前没有可取消的订单')
      return
    }

    if (!isValidTestVisitorId(effectiveVisitorId) || !isValidVisitorSig(effectiveVisitorSig)) {
      message.warning('缺少访客校验信息，无法取消该订单')
      return
    }

    setCanceling(true)
    try {
      const res = await api.post('/api/pay/test/cancel', {
        trade_no: effectiveTradeNo,
        visitor_id: effectiveVisitorId,
        visitor_sig: effectiveVisitorSig
      })

      if (res.data.code === 0) {
        clearLastOrderContext()
        setLastOrderContext(null)
        setStatusCheck({ visible: false, loading: false, paid: false, refunded: false, refundFailed: false, message: '' })
        message.success('订单已取消，可重新创建新订单')
        navigate('/test-pay', { replace: true })
      } else {
        message.warning(res.data.msg || '取消订单失败')
      }
    } catch (error) {
      message.error('取消订单失败，请稍后重试')
    } finally {
      setCanceling(false)
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.container}>
        <Card className={styles.heroCard}>
          <div className={styles.heroTop}>
            <span className={styles.heroBadge}>
              <ExperimentOutlined /> 测试支付
            </span>
          </div>
          <Title level={3} className={styles.heroTitle}>
            在线支付体验
          </Title>
          <Paragraph className={styles.heroDesc}>
            用于体验支付流程。输入金额后选择支付方式，即可进入收银台完成测试。
          </Paragraph>
        </Card>

        {statusCheck.visible && (
          <Alert
            type={statusCheck.loading ? 'info' : statusCheck.refundFailed ? 'warning' : statusCheck.paid ? 'success' : 'warning'}
            showIcon
            icon={statusCheck.paid ? <CheckCircleOutlined /> : undefined}
            message={
              statusCheck.loading
                ? '正在确认支付结果...'
                : statusCheck.refundFailed
                  ? statusCheck.message
                : statusCheck.paid
                  ? (statusCheck.refunded ? '支付成功，款项已自动退回' : '支付成功')
                  : (
                      <span className={styles.statusInlineAction}>
                        <span>{statusCheck.message || '订单尚未支付完成'}</span>
                        {hasOrderContext && (
                          <Button size="small" danger loading={canceling} onClick={handleCancelOrder}>
                            取消订单
                          </Button>
                        )}
                      </span>
                    )
            }
            description={`订单号：${effectiveTradeNo || '-'}`}
          />
        )}

        <Card className={styles.formCard}>
          <div className={styles.formHead}>
            <Title level={4} className={styles.formTitle}>
              填写支付信息
            </Title>
            <Paragraph className={styles.formSub}>
              金额支持最多两位小数，当前最大可输入 {Number(config.max_amount || 50000).toFixed(2)} 元。
            </Paragraph>
          </div>

          {loading ? (
            <div className={styles.loadingWrap}>
              <Spin size="large" />
              <div className={styles.loadingText}>正在加载支付信息...</div>
            </div>
          ) : !config.enabled ? (
            <Alert
              type="warning"
              showIcon
              message="测试支付不可用"
              description={formatUnavailableReason(config.reason)}
            />
          ) : (
            <Form layout="vertical">
              <Form.Item label="测试金额（元）" required>
                <InputNumber
                  min={0.01}
                  max={Number(config.max_amount || 50000)}
                  precision={2}
                  step={0.1}
                  value={money}
                  onChange={(value) => setMoney(value)}
                  style={{ width: '100%', maxWidth: 320 }}
                  placeholder="请输入测试金额"
                />
              </Form.Item>

              <Form.Item label="支付方式" required>
                <div className={styles.payTypeGrid}>
                  {config.pay_types.map((type) => (
                    <button
                      type="button"
                      key={type.type_code}
                      className={`${styles.payTypeBtn} ${selectedType === type.type_code ? styles.payTypeBtnActive : ''}`}
                      onClick={() => setSelectedType(type.type_code)}
                    >
                      <img
                        className={styles.payTypeIcon}
                        src={`/assets/icon/${type.type_code}.ico`}
                        alt={type.type_name}
                        onError={(event) => {
                          event.currentTarget.style.visibility = 'hidden'
                        }}
                      />
                      <span className={styles.payTypeName}>{type.type_name}</span>
                    </button>
                  ))}
                </div>
              </Form.Item>

              <div className={styles.actionRow}>
                <Button type="primary" loading={submitting} onClick={handleCreateOrder}>
                  立即前往收银台
                </Button>
                <Button icon={<ReloadOutlined />} loading={statusCheck.loading} onClick={() => refreshOrderStatus(true)}>
                  刷新订单信息
                </Button>
                <Button onClick={() => navigate('/')}>返回首页</Button>
              </div>
            </Form>
          )}
        </Card>

        <Card className={styles.tipCard}>
          <div className={styles.tipTitle}>温馨提示</div>
          <div className={styles.tipText}>1. 本页面仅用于支付体验与联调，请勿用于真实交易。</div>
          <div className={styles.tipText}>2. 支付成功后，页面会自动更新并展示当前订单状态。</div>
          {config.auto_refund && <div className={styles.tipText}>3. 当前已开启秒退，支付成功后将自动尝试原路退款。</div>}
          <div className={styles.tipText}>{config.auto_refund ? '4' : '3'}. 若暂无可选支付方式，请稍后再试或联系平台客服。</div>
        </Card>
      </main>
    </div>
  )
}

export default TestPay

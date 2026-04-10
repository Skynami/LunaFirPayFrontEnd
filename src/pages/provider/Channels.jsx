import { useState, useEffect } from 'react'
import { Table, Button, Tag, Modal, Form, Input, Select, InputNumber, Checkbox, Radio, Divider, Alert, message, Upload, Space, Collapse, Row, Col, Empty } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, FileProtectOutlined, CheckCircleOutlined, SafetyCertificateOutlined, SettingOutlined } from '@ant-design/icons'
import api from '../../utils/api'
import { useIsMobile } from '../../utils/useIsMobile'

function Channels() {
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(false)
  const [channels, setChannels] = useState([])
  const [plugins, setPlugins] = useState([])

  const [showForm, setShowForm] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [channelForm] = Form.useForm()
  
  // 当前选中的插件信息
  const [currentPlugin, setCurrentPlugin] = useState(null)
  // 插件配置项
  const [pluginConfig, setPluginConfig] = useState({})
  // 选择的支付方式（按类型分组，每个类型只能选一个）
  // 格式：{ alipay: 'key', wxpay: 'key', ... } 或通用select时为 { common: 'key' }
  const [selectedTypes, setSelectedTypes] = useState({})
  // 证书上传状态
  const [certFiles, setCertFiles] = useState({})
  // 证书密码
  const [certPassword, setCertPassword] = useState('')
  // 选择的支付类型（多选）
  const [selectedPayTypes, setSelectedPayTypes] = useState([])
  // 微信公众号绑定配置
  const [wxmpConfig, setWxmpConfig] = useState({ appid: '', appsecret: '' })
  // 微信小程序绑定配置
  const [wxaConfig, setWxaConfig] = useState({ appid: '', appsecret: '' })
  // 上传中状态
  const [uploading, setUploading] = useState(false)

  const fetchChannels = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/channels')
      if (res.data.code === 0) {
        setChannels(res.data.data || [])
      }
    } catch (error) {
      message.error('获取通道列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchPlugins = async () => {
    try {
      const res = await api.get('/api/admin/plugins')
      if (res.data.code === 0) {
        setPlugins(res.data.data || [])
      }
    } catch (error) {
      console.error('获取插件列表失败:', error)
    }
  }

  const showAddChannel = () => {
    setIsEdit(false)
    setCurrentPlugin(null)
    setPluginConfig({})
    setSelectedTypes({})
    setCertFiles({})
    setCertPassword('')
    setSelectedPayTypes([])
    setWxmpConfig({ appid: '', appsecret: '' })
    setWxaConfig({ appid: '', appsecret: '' })
    channelForm.setFieldsValue({
      id: null,
      name: '',
      plugin: undefined,
      cost_rate: 0,
      min_money: '',
      max_money: '',
      day_limit: '',
      time_start: null,
      time_stop: null,
      priority: 0,
      status: 1,
      notify_url: ''
    })
    setShowForm(true)
  }

  const editChannel = async (row) => {
    setIsEdit(true)
    
    // 先获取完整的通道详情（包含config）
    try {
      const res = await api.get(`/api/admin/channels/${row.id}`)
      if (res.data.code !== 0) {
        message.error(res.data.msg || '获取通道详情失败')
        return
      }
      const channelData = res.data.data
      
      // 找到对应的插件
      const plugin = plugins.find(p => p.name === channelData.plugin_name || p.name === channelData.plugin)
      setCurrentPlugin(plugin || null)
      
      // 解析配置
      let config = {}
      let appTypes = {}  // 改为对象格式
      let certs = {}
      let wxmp = { appid: '', appsecret: '' }
      let wxa = { appid: '', appsecret: '' }
      try {
        if (channelData.config) {
          const parsed = typeof channelData.config === 'string' ? JSON.parse(channelData.config) : channelData.config
          config = parsed.params || {}
          // 兼容旧格式（数组）和新格式（对象）
          const rawApptype = parsed.apptype
          if (Array.isArray(rawApptype)) {
            // 旧格式数组转对象：['alipay_1', 'wxpay_2'] => {alipay: '1', wxpay: '2'}
            // 或 ['1', '2'] => {common: '1'} (只取第一个)
            rawApptype.forEach(item => {
              const match = item.match(/^(alipay|wxpay|qqpay|bank|jdpay|paypal|ecny)_(.+)$/)
              if (match) {
                appTypes[match[1]] = match[2]
              } else {
                // 通用select，用common作为key
                appTypes.common = item
              }
            })
          } else if (rawApptype && typeof rawApptype === 'object') {
            // 新格式对象直接使用
            appTypes = rawApptype
          }
          certs = parsed.certs || {}
          wxmp = parsed.wxmp || { appid: '', appsecret: '' }
          wxa = parsed.wxa || { appid: '', appsecret: '' }
        }
      } catch (e) {
        console.error('解析配置失败:', e)
      }
      
      setPluginConfig(config)
      setSelectedTypes(appTypes)
      setCertFiles(certs)
      setCertPassword('')
      setWxmpConfig(wxmp)
      setWxaConfig(wxa)
      
      // 解析 pay_type：逗号分隔的类型
      const payType = channelData.pay_type || channelData.type || ''
      const payTypes = payType ? payType.split(',') : (plugin?.types || [])
      setSelectedPayTypes(payTypes)
      
      channelForm.setFieldsValue({
        id: channelData.id,
        name: channelData.channel_name || channelData.name,
        plugin: channelData.plugin_name || channelData.plugin,
        cost_rate: (channelData.cost_rate || 0) * 100,
        min_money: channelData.min_money || '',
        max_money: channelData.max_money || '',
        day_limit: channelData.day_limit || '',
        time_start: channelData.time_start ?? null,
        time_stop: channelData.time_stop ?? null,
        priority: channelData.priority || 0,
        status: channelData.status,
        notify_url: channelData.notify_url || ''
      })
      setShowForm(true)
    } catch (error) {
      message.error('获取通道详情失败: ' + error.message)
    }
  }

  const onPluginChange = (pluginName) => {
    const plugin = plugins.find(p => p.name === pluginName)
    setCurrentPlugin(plugin || null)
    setPluginConfig({})
    setSelectedTypes({})
    setCertFiles({})
    setCertPassword('')
    setWxmpConfig({ appid: '', appsecret: '' })
    setWxaConfig({ appid: '', appsecret: '' })
    // 默认全选该插件支持的所有类型
    setSelectedPayTypes(plugin?.types || [])
  }

  // 上传证书
  const uploadCertificate = async (file, certKey, pluginName) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('plugin', pluginName)
    formData.append('channelId', channelForm.getFieldValue('id') || `new_${Date.now()}`)
    if (certPassword) {
      formData.append('password', certPassword)
    }
    
    setUploading(true)
    try {
      const res = await api.post('/api/cert/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (res.data.code === 0) {
        message.success(`${file.name} 上传成功`)
        // 保存证书文件名 (用于存储到数据库)
        setCertFiles(prev => ({
          ...prev,
          [certKey]: {
            filename: res.data.data.filename,
            originalFilename: res.data.data.originalFilename
          }
        }))
        return false // 阻止默认上传行为
      } else {
        message.error(res.data.msg || '上传失败')
      }
    } catch (error) {
      message.error('上传失败: ' + (error.response?.data?.msg || error.message))
    } finally {
      setUploading(false)
    }
    return false
  }

  const saveChannel = async () => {
    try {
      const values = await channelForm.validateFields()
      
      if (!currentPlugin) {
        message.error('请选择支付插件')
        return
      }
      
      // 检查是否有需要选择支付方式的配置
      const hasTypeSelects = currentPlugin.select_alipay || currentPlugin.select_wxpay || 
                            currentPlugin.select_qqpay || currentPlugin.select_bank ||
                            currentPlugin.select_jdpay || currentPlugin.select_paypal ||
                            currentPlugin.select_ecny
      const hasCommonSelect = currentPlugin.select && Object.keys(currentPlugin.select).length > 0
      
      if (hasCommonSelect && !selectedTypes.common) {
        message.error('请选择一种支付方式')
        return
      }
      
      // 对于按类型分的select，检查已启用的类型是否都选择了支付方式
      if (hasTypeSelects) {
        for (const type of selectedPayTypes) {
          const selectKey = `select_${type}`
          if (currentPlugin[selectKey] && Object.keys(currentPlugin[selectKey]).length > 0 && !selectedTypes[type]) {
            const typeLabels = { alipay: '支付宝', wxpay: '微信', qqpay: 'QQ', bank: '网银', jdpay: '京东', paypal: 'PayPal', ecny: '数币' }
            message.error(`请为 ${typeLabels[type] || type} 选择一种支付方式`)
            return
          }
        }
      }

      // 检查需要证书的插件是否已上传必须的证书
      if (currentPlugin.certs && currentPlugin.certs.length > 0) {
        for (const cert of currentPlugin.certs) {
          // 只检查必须的证书
          if (cert.required && !certFiles[cert.key]?.filename) {
            message.error(`请上传 ${cert.name}`)
            return
          }
        }
      }

      // 检查是否选择了支付类型
      if (selectedPayTypes.length === 0) {
        message.error('请选择支付类型')
        return
      }
      
      setSaveLoading(true)
      
      // 将对象格式的selectedTypes转换为数组格式存储（兼容后端）
      // {alipay: '1', wxpay: '2'} => ['alipay_1', 'wxpay_2']
      // {common: '1'} => ['1']
      const apptypeArray = []
      for (const [key, value] of Object.entries(selectedTypes)) {
        if (value) {
          if (key === 'common') {
            apptypeArray.push(value)
          } else {
            apptypeArray.push(`${key}_${value}`)
          }
        }
      }
      
      // 将证书文件名保存到config
      const config = {
        params: pluginConfig,
        apptype: apptypeArray,  // 存储为数组格式，兼容后端
        certs: certFiles,  // 证书文件名 
        // 只有当插件支持绑定且有配置时才保存
        ...(currentPlugin.bindwxmp && (wxmpConfig.appid || wxmpConfig.appsecret) ? { wxmp: wxmpConfig } : {}),
        ...(currentPlugin.bindwxa && (wxaConfig.appid || wxaConfig.appsecret) ? { wxa: wxaConfig } : {})
      }
      
      const submitData = {
        id: values.id,
        name: values.name,
        plugin: values.plugin,
        pay_type: selectedPayTypes.join(','),
        cost_rate: values.cost_rate / 100,
        min_money: values.min_money || 0,
        max_money: values.max_money || 0,
        day_limit: values.day_limit || 0,
        time_start: values.time_start ?? null,
        time_stop: values.time_stop ?? null,
        priority: values.priority || 0,
        status: values.status,
        notify_url: values.notify_url || '',
        config: JSON.stringify(config)
      }
      
      const url = isEdit ? '/api/admin/channels/update' : '/api/admin/channels/create'
      const res = await api.post(url, submitData)
      
      if (res.data.code === 0) {
        message.success('保存成功')
        setShowForm(false)
        fetchChannels()
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      if (error.errorFields) return
      message.error('保存失败: ' + error.message)
    } finally {
      setSaveLoading(false)
    }
  }

  const toggleStatus = async (row) => {
    const newStatus = row.status === 1 ? 0 : 1
    const action = newStatus === 1 ? '启用' : '禁用'
    
    try {
      const res = await api.post('/api/admin/channels/update', {
        id: row.id,
        status: newStatus
      })
      if (res.data.code === 0) {
        message.success(`${action}成功`)
        fetchChannels()
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('操作失败')
    }
  }

  const deleteChannel = (row) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除通道「${row.channel_name || row.name}」吗？删除后不可恢复`,
      okText: '删除',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await api.post('/api/admin/channels/delete', { id: row.id })
          if (res.data.code === 0) {
            message.success('删除成功')
            fetchChannels()
          } else {
            message.error(res.data.msg)
          }
        } catch (error) {
          message.error('删除失败')
        }
      }
    })
  }

  useEffect(() => {
    fetchPlugins()
    fetchChannels()
  }, [])

  const columns = [
    { 
      title: 'ID', 
      dataIndex: 'channel_id',
      width: 60,
      align: 'center'
    },
    { 
      title: '通道名称', 
      dataIndex: 'channel_name', 
      width: 150,
      render: (v, row) => v || row.name
    },
    { 
      title: '支付插件', 
      dataIndex: 'plugin_name', 
      width: 150,
      render: (v, row) => {
        const pluginName = v || row.plugin
        // 从 plugins 列表中找到对应插件的中文名
        const plugin = plugins.find(p => p.name === pluginName)
        const showName = plugin?.showname || pluginName
        return (
          <span>
            {showName}
            <span style={{ color: '#999', fontSize: 12, marginLeft: 4 }}>({pluginName})</span>
          </span>
        )
      }
    },
    {
      title: '支持类型',
      dataIndex: 'pay_type',
      width: 160,
      render: (payType, row) => {
        const pluginName = row.plugin_name || row.plugin
        const plugin = plugins.find(p => p.name === pluginName)
        const allTypes = plugin?.types || []
        const typeLabels = { alipay: '支付宝', wxpay: '微信', qqpay: 'QQ', bank: '银联', jdpay: '京东', paypal: 'PayPal', ecny: '数币' }
        const colors = { alipay: 'blue', wxpay: 'green', qqpay: 'cyan', bank: 'red', jdpay: 'orange', paypal: 'purple', ecny: 'gold' }
        
        // 解析选中的类型
        const selectedTypes = payType ? payType.split(',') : []
        
        return (
          <Space size={2} wrap>
            {allTypes.map(type => {
              const isSelected = selectedTypes.includes(type)
              return (
                <Tag 
                  key={type} 
                  color={isSelected ? colors[type] : 'default'} 
                  style={{ marginRight: 0, opacity: isSelected ? 1 : 0.4 }}
                >
                  {isSelected && '✓'}{typeLabels[type] || type}
                </Tag>
              )
            })}
          </Space>
        )
      }
    },
    {
      title: '通道成本',
      dataIndex: 'cost_rate',
      width: 100,
      align: 'center',
      render: (v) => {
        if (!v || v === 0) return <span style={{ color: '#999' }}>-</span>
        return <span style={{ color: '#ff4d4f' }}>{((v || 0) * 100).toFixed(2)}%</span>
      }
    },
    {
      title: '单笔限额',
      width: 120,
      align: 'center',
      render: (_, row) => {
        const min = parseFloat(row.min_money) || 0
        const max = parseFloat(row.max_money) || 0
        if (min === 0 && max === 0) return <span style={{ color: '#999' }}>无限额</span>
        return <span>{min} - {max === 0 ? '无' : max}</span>
      }
    },
    {
      title: '剩余额度',
      width: 100,
      align: 'center',
      render: (_, row) => {
        const remaining = row.day_remaining
        if (remaining === -1 || remaining === undefined) {
          return <span style={{ color: '#999' }}>无限额</span>
        }
        const dayLimit = parseFloat(row.day_limit) || 0
        const percent = dayLimit > 0 ? (remaining / dayLimit * 100).toFixed(0) : 100
        const color = percent > 50 ? '#52c41a' : percent > 20 ? '#faad14' : '#ff4d4f'
        return (
          <span style={{ color }}>
            ¥{remaining.toFixed(2)}
          </span>
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
    { title: '优先级', dataIndex: 'priority', width: 80, align: 'center' },
    {
      title: '操作',
      width: 180,
      fixed: 'right',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => editChannel(row)}>编辑</Button>
          <Button
            type="link"
            size="small"
            danger={row.status === 1}
            onClick={() => toggleStatus(row)}
          >
            {row.status === 1 ? '禁用' : '启用'}
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteChannel(row)}>删除</Button>
        </div>
      )
    }
  ]

  // 渲染证书上传区域
  const renderCertUpload = () => {
    if (!currentPlugin) return null
    
    // 使用后端返回的 certs 配置
    const certs = currentPlugin.certs
    if (!certs || certs.length === 0) return null
    
    // 分离必须和可选证书
    const requiredCerts = certs.filter(c => c.required)
    const optionalCerts = certs.filter(c => c.optional || (!c.required && !c.optional))
    
    // 检查是否全部是可选的
    const allOptional = requiredCerts.length === 0
    
    // 渲染单个证书上传项（用于必须证书）
    const renderCertItem = (cert) => {
      const hasUploaded = !!certFiles[cert.key]?.filename
      
      return (
        <Form.Item 
          key={cert.key} 
          label={cert.name}
          required
          extra={cert.desc ? <span style={{ color: '#999', fontSize: 12 }}>{cert.desc}</span> : null}
          style={{ marginBottom: 12 }}
        >
          <Space>
            <Upload
              accept={cert.ext}
              showUploadList={false}
              beforeUpload={(file) => uploadCertificate(file, cert.key, currentPlugin.name)}
              disabled={uploading}
            >
              <Button size="small" icon={<UploadOutlined />} loading={uploading}>
                {cert.ext}
              </Button>
            </Upload>
            {hasUploaded ? (
              <Tag icon={<CheckCircleOutlined />} color="success">
                {certFiles[cert.key].originalFilename || certFiles[cert.key].filename}
              </Tag>
            ) : (
              <Tag color="error">未上传</Tag>
            )}
          </Space>
        </Form.Item>
      )
    }
    
    return (
      <>
        {/* 证书密码输入 - 如果有需要密码的证书，放在证书前面 */}
        {certs.some(c => c.needPassword) && (
          <Form.Item 
            label="证书密码" 
            extra="PFX/P12证书需要提供密码"
            style={{ marginBottom: 12 }}
          >
            <Input.Password
              value={certPassword}
              onChange={(e) => setCertPassword(e.target.value)}
              placeholder="请输入证书密码"
              style={{ width: '100%' }}
            />
          </Form.Item>
        )}
        
        {/* 必须的证书 - 直接在主区域显示 */}
        {requiredCerts.map(renderCertItem)}
        
        {/* 可选的证书 - 折叠显示 */}
        {optionalCerts.length > 0 && (
          <Form.Item 
            label={<span>可选证书 <Tag color="blue">{optionalCerts.length}</Tag></span>}
            style={{ marginBottom: 12 }}
          >
            <Collapse 
              size="small"
              defaultActiveKey={allOptional ? ['optional'] : []}
              items={[{
                key: 'optional',
                label: (
                  <span style={{ fontSize: 13 }}>
                    {allOptional ? '点击展开证书配置' : '点击展开可选证书'}
                    {optionalCerts.some(c => certFiles[c.key]?.filename) && (
                      <Tag color="green" style={{ marginLeft: 8 }}>
                        已配置 {optionalCerts.filter(c => certFiles[c.key]?.filename).length} 项
                      </Tag>
                    )}
                  </span>
                ),
                children: (
                  <div style={{ padding: '8px 0' }}>
                    {optionalCerts.map(cert => {
                      const hasUploaded = !!certFiles[cert.key]?.filename
                      return (
                        <div key={cert.key} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          marginBottom: 8,
                          padding: '4px 0'
                        }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 13 }}>{cert.name}</span>
                            {cert.desc && <span style={{ color: '#999', fontSize: 11, marginLeft: 8 }}>{cert.desc}</span>}
                          </div>
                          <Space size={4}>
                            <Upload
                              accept={cert.ext}
                              showUploadList={false}
                              beforeUpload={(file) => uploadCertificate(file, cert.key, currentPlugin.name)}
                              disabled={uploading}
                            >
                              <Button size="small" icon={<UploadOutlined />} loading={uploading}>
                                {cert.ext}
                              </Button>
                            </Upload>
                            {hasUploaded ? (
                              <Tag icon={<CheckCircleOutlined />} color="success" style={{ margin: 0 }}>
                                {(certFiles[cert.key].originalFilename || certFiles[cert.key].filename).substring(0, 15)}
                              </Tag>
                            ) : (
                              <Tag color="default" style={{ margin: 0 }}>未配置</Tag>
                            )}
                          </Space>
                        </div>
                      )
                    })}
                  </div>
                )
              }]}
            />
          </Form.Item>
        )}
      </>
    )
  }

  // 渲染插件配置表单
  const renderPluginConfigForm = () => {
    if (!currentPlugin) return null
    
    const typeLabels = {
      alipay: '支付宝',
      wxpay: '微信',
      qqpay: 'QQ',
      bank: '网银',
      jdpay: '京东',
      paypal: 'PayPal',
      ecny: '数币'
    }
    
    // 检查是否有按类型分的select
    const hasTypeSelects = currentPlugin.select_alipay || currentPlugin.select_wxpay || 
                          currentPlugin.select_qqpay || currentPlugin.select_bank ||
                          currentPlugin.select_jdpay || currentPlugin.select_paypal ||
                          currentPlugin.select_ecny
    
    // 按类型获取支付方式选项
    const getTypeSelectOptions = () => {
      if (!hasTypeSelects) return null
      
      const typeSelects = {
        alipay: currentPlugin.select_alipay,
        wxpay: currentPlugin.select_wxpay,
        qqpay: currentPlugin.select_qqpay,
        bank: currentPlugin.select_bank,
        jdpay: currentPlugin.select_jdpay,
        paypal: currentPlugin.select_paypal,
        ecny: currentPlugin.select_ecny
      }
      
      const result = []
      for (const [type, selectObj] of Object.entries(typeSelects)) {
        if (selectObj && Object.keys(selectObj).length > 0) {
          const isTypeEnabled = selectedPayTypes.includes(type)
          result.push({
            type,
            label: typeLabels[type] || type,
            enabled: isTypeEnabled,
            options: Object.entries(selectObj).map(([key, label]) => ({
              key,
              label
            }))
          })
        }
      }
      return result
    }
    
    // 获取通用select选项
    const getCommonSelectOptions = () => {
      if (!currentPlugin.select || hasTypeSelects) return null
      return Object.entries(currentPlugin.select).map(([key, label]) => ({
        key,
        label
      }))
    }
    
    const typeSelectGroups = getTypeSelectOptions()
    const commonSelectOptions = getCommonSelectOptions()
    
    // 处理单选变化
    const handleRadioChange = (type, value) => {
      setSelectedTypes(prev => ({
        ...prev,
        [type]: value
      }))
    }
    
    return (
      <>
        {/* 插件说明 */}
        {currentPlugin.note && (
          <Alert 
            message={<span dangerouslySetInnerHTML={{ __html: currentPlugin.note }} />}
            type="info" 
            style={{ marginBottom: 12 }} 
            size="small"
          />
        )}
        
        {/* 按类型分组的支付方式选择（单选，横排） */}
        {typeSelectGroups && typeSelectGroups.length > 0 && typeSelectGroups.map(({ type, label, enabled, options }) => (
          <Form.Item 
            key={type}
            label={<span>{label}支付方式 {!enabled && <Tag color="default" style={{ fontSize: 11 }}>未启用</Tag>}</span>}
            style={{ marginBottom: 12 }}
          >
            <Radio.Group
              value={selectedTypes[type]}
              onChange={(e) => handleRadioChange(type, e.target.value)}
              disabled={!enabled}
            >
              <Space wrap>
                {options.map(({ key, label: optLabel }) => (
                  <Radio key={key} value={key}>
                    {optLabel}
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </Form.Item>
        ))}
        
        {/* 通用select选项（单选，横排） */}
        {commonSelectOptions && commonSelectOptions.length > 0 && (
          <Form.Item 
            label="支付方式" 
            style={{ marginBottom: 12 }}
          >
            <Radio.Group
              value={selectedTypes.common}
              onChange={(e) => handleRadioChange('common', e.target.value)}
            >
              <Space wrap>
                {commonSelectOptions.map(({ key, label }) => (
                  <Radio key={key} value={key}>
                    {label}
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </Form.Item>
        )}
        
        {/* 显示无需选择支付方式的类型提示 */}
        {currentPlugin && (() => {
          const typeLabels = {
            alipay: '支付宝', wxpay: '微信', qqpay: 'QQ钱包', 
            bank: '网银', jdpay: '京东', paypal: 'PayPal', ecny: '数币'
          }
          // 检查哪些已选类型没有对应的select选项
          const hasTypeSelect = (type) => {
            return currentPlugin[`select_${type}`] && Object.keys(currentPlugin[`select_${type}`]).length > 0
          }
          const directTypes = selectedPayTypes.filter(type => 
            !currentPlugin.select && !hasTypeSelect(type)
          )
          if (directTypes.length > 0) {
            return (
              <Alert
                type="success"
                size="small"
                style={{ marginBottom: 12 }}
                message={
                  <span style={{ fontSize: 12 }}>
                    <b>{directTypes.map(t => typeLabels[t] || t).join('、')}</b> 无需选择支付方式，选中即启用
                  </span>
                }
              />
            )
          }
          return null
        })()}
        
        {/* 密钥配置标题 - 仅当有inputs时显示 */}
        {currentPlugin.inputs && Object.keys(currentPlugin.inputs).length > 0 && (
          <Divider orientation="left" orientationMargin={0} style={{ margin: '8px 0 12px' }}>
            密钥配置
          </Divider>
        )}
        
        {/* 插件参数 */}
        {currentPlugin.inputs && Object.entries(currentPlugin.inputs).map(([key, input]) => (
          <Form.Item 
            key={key} 
            label={input.name}
            style={{ marginBottom: 12 }}
            extra={input.note && <span style={{ color: '#999', fontSize: 12 }} dangerouslySetInnerHTML={{ __html: input.note }} />}
          >
            {input.type === 'textarea' ? (
              <Input.TextArea
                rows={3}
                value={pluginConfig[key] || ''}
                onChange={(e) => setPluginConfig({ ...pluginConfig, [key]: e.target.value })}
                placeholder={`请输入 ${input.name}`}
              />
            ) : input.type === 'select' ? (
              <Select
                value={pluginConfig[key]}
                onChange={(v) => setPluginConfig({ ...pluginConfig, [key]: v })}
                placeholder={`请选择${input.name}`}
              >
                {input.options && (
                  Array.isArray(input.options) 
                    ? input.options.map(opt => (
                        <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                      ))
                    : Object.entries(input.options).map(([value, label]) => (
                        <Select.Option key={value} value={value}>{label}</Select.Option>
                      ))
                )}
              </Select>
            ) : (
              <Input
                value={pluginConfig[key] || ''}
                onChange={(e) => setPluginConfig({ ...pluginConfig, [key]: e.target.value })}
                placeholder={`请输入 ${input.name}`}
              />
            )}
          </Form.Item>
        ))}
        
        {/* 证书上传区域 */}
        {renderCertUpload()}
        
        {/* 绑定微信公众号配置 */}
        {currentPlugin.bindwxmp && (
          <Collapse 
            style={{ marginTop: 16 }}
            items={[{
              key: 'wxmp',
              label: '绑定微信公众号（可选，用于微信内JSAPI支付）',
              children: (
                <Form layout="vertical" size="small">
                  <Form.Item label="公众号AppID" style={{ marginBottom: 8 }}>
                    <Input
                      value={wxmpConfig.appid}
                      onChange={(e) => setWxmpConfig({ ...wxmpConfig, appid: e.target.value })}
                      placeholder="请输入服务号或订阅号的AppID"
                    />
                  </Form.Item>
                  <Form.Item label="公众号AppSecret" style={{ marginBottom: 0 }}>
                    <Input.Password
                      value={wxmpConfig.appsecret}
                      onChange={(e) => setWxmpConfig({ ...wxmpConfig, appsecret: e.target.value })}
                      placeholder="请输入服务号或订阅号的AppSecret"
                    />
                  </Form.Item>
                </Form>
              )
            }]}
          />
        )}
        
        {/* 绑定微信小程序配置 */}
        {currentPlugin.bindwxa && (
          <Collapse 
            style={{ marginTop: 8 }}
            items={[{
              key: 'wxa',
              label: '绑定微信小程序（可选，用于小程序跳转支付）',
              children: (
                <Form layout="vertical" size="small">
                  <Form.Item label="小程序AppID" style={{ marginBottom: 8 }}>
                    <Input
                      value={wxaConfig.appid}
                      onChange={(e) => setWxaConfig({ ...wxaConfig, appid: e.target.value })}
                      placeholder="请输入小程序的AppID"
                    />
                  </Form.Item>
                  <Form.Item label="小程序AppSecret" style={{ marginBottom: 0 }}>
                    <Input.Password
                      value={wxaConfig.appsecret}
                      onChange={(e) => setWxaConfig({ ...wxaConfig, appsecret: e.target.value })}
                      placeholder="请输入小程序的AppSecret"
                    />
                  </Form.Item>
                </Form>
              )
            }]}
          />
        )}
      </>
    )
  }

  return (
    <div>
      <h2 className="page-title">支付通道配置</h2>

      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={showAddChannel}>
          添加通道
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={channels}
        loading={loading}
        rowKey="id"
        pagination={false}
        scroll={{ x: 'max-content' }}
        style={{ width: '100%' }}
        bordered
        size="middle"
      />

      {/* 添加/编辑通道弹窗 */}
      <Modal
        title={isEdit ? '编辑支付通道' : '添加支付通道'}
        open={showForm}
        onCancel={() => setShowForm(false)}
        onOk={saveChannel}
        confirmLoading={saveLoading}
        width={isMobile ? '100%' : 1100}
        destroyOnHidden
        style={isMobile ? { top: 20, maxWidth: '100vw', margin: '0 auto' } : undefined}
        styles={isMobile ? { body: { maxHeight: '70vh', overflowY: 'auto' } } : undefined}
      >
        <Row gutter={isMobile ? [0, 16] : 24}>
          {/* 左侧：基本设置 */}
          <Col xs={24} md={12}>
            <Form 
              form={channelForm} 
              layout="horizontal" 
              labelCol={{ span: 6 }}
              wrapperCol={{ span: 17 }}
            >
              <Form.Item name="id" hidden>
                <Input />
              </Form.Item>
              
              <Divider orientation="left" orientationMargin={0}>
                <SettingOutlined style={{ marginRight: 8 }} />
                基本设置
              </Divider>
              
              <Form.Item
                label="通道名称"
                name="name"
                rules={[{ required: true, message: '请输入通道名称' }]}
              >
                <Input placeholder="输入通道显示名称" />
              </Form.Item>
              
              <Form.Item
                label="支付插件"
                name="plugin"
                rules={[{ required: true, message: '请选择支付插件' }]}
              >
                <Select
                  placeholder="选择支付插件"
                  onChange={onPluginChange}
                  disabled={isEdit}
                  showSearch
                  filterOption={(input, option) => {
                    const label = option?.label || ''
                    return label.toLowerCase().includes(input.toLowerCase())
                  }}
                  options={plugins.map(p => ({
                    value: p.name,
                    label: `${p.showname} (${p.name})`
                  }))}
                />
              </Form.Item>
              
              <Form.Item 
                label="通道成本" 
                name="cost_rate"
                extra="支付给上游的成本，仅统计利润"
              >
                <Space.Compact style={{ width: '100%' }}>
                  <InputNumber 
                    min={0} 
                    max={100} 
                    step={0.01} 
                    precision={2}
                    style={{ width: 'calc(100% - 32px)' }}
                  />
                  <Button disabled style={{ width: 32 }}>%</Button>
                </Space.Compact>
              </Form.Item>
              
              <Form.Item 
                label="单笔限额" 
                style={{ marginBottom: 8 }}
                extra="留空 0 表示无限额"
              >
                <Space>
                  <Form.Item name="min_money" noStyle>
                    <InputNumber min={0} precision={2} placeholder="最小" style={{ width: 100 }} />
                  </Form.Item>
                  <span>~</span>
                  <Form.Item name="max_money" noStyle>
                    <InputNumber min={0} precision={2} placeholder="最大" style={{ width: 100 }} />
                  </Form.Item>
                </Space>
              </Form.Item>
              
              <Form.Item label="单日限额" name="day_limit">
                <InputNumber min={0} precision={2} placeholder="留空无限额" style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item 
                label="开放时间" 
                extra={<span style={{ color: '#999' }}>设置通道开放时间段（0-23小时），留空表示全天开放。如设置22-6表示22点到次日6点</span>}
              >
                <Space>
                  <Form.Item name="time_start" noStyle>
                    <InputNumber min={0} max={23} precision={0} placeholder="开始" style={{ width: 80 }} />
                  </Form.Item>
                  <span>~</span>
                  <Form.Item name="time_stop" noStyle>
                    <InputNumber min={0} max={23} precision={0} placeholder="结束" style={{ width: 80 }} />
                  </Form.Item>
                  <span style={{ color: '#999' }}>时</span>
                </Space>
              </Form.Item>
              
              <Form.Item label="优先级/状态">
                <Space size={16}>
                  <Form.Item name="priority" noStyle>
                    <InputNumber min={0} max={999} style={{ width: 80 }} placeholder="优先级" />
                  </Form.Item>
                  <Form.Item name="status" noStyle>
                    <Select style={{ width: 90 }}>
                      <Select.Option value={1}>启用</Select.Option>
                      <Select.Option value={0}>禁用</Select.Option>
                    </Select>
                  </Form.Item>
                </Space>
              </Form.Item>
              
              {/* 支付类型选择 - 多选 */}
              <Form.Item label="支付类型" required>
                {currentPlugin && currentPlugin.types && currentPlugin.types.length > 0 ? (
                  <Checkbox.Group
                    value={selectedPayTypes}
                    onChange={(values) => {
                      // 如果只有一个类型，不允许取消
                      if (currentPlugin.types.length === 1) return
                      // 至少保留一个
                      if (values.length === 0) return
                      setSelectedPayTypes(values)
                      
                      // 自动清除已禁用类型对应的支付方式选择
                      const newSelectedTypes = { ...selectedTypes }
                      Object.keys(newSelectedTypes).forEach(key => {
                        // 如果key不是common且该类型已被取消选择，则删除
                        if (key !== 'common' && !values.includes(key)) {
                          delete newSelectedTypes[key]
                        }
                      })
                      setSelectedTypes(newSelectedTypes)
                    }}
                  >
                    <Space wrap>
                      {currentPlugin.types.map(type => {
                        const typeLabels = { alipay: '支付宝', wxpay: '微信支付', qqpay: 'QQ钱包', bank: '网银支付', jdpay: '京东支付', paypal: 'PayPal', ecny: '数字人民币' }
                        const isSingleType = currentPlugin.types.length === 1
                        return (
                          <Checkbox 
                            key={type} 
                            value={type}
                            disabled={isSingleType}
                            style={isSingleType ? { color: '#999' } : {}}
                          >
                            {typeLabels[type] || type}
                          </Checkbox>
                        )
                      })}
                    </Space>
                  </Checkbox.Group>
                ) : (
                  <span style={{ color: '#999' }}>请先选择支付插件</span>
                )}
              </Form.Item>
              
              <Form.Item 
                label="自定义回调" 
                name="notify_url"
                extra="留空使用系统默认回调地址"
              >
                <Input placeholder="https://your-domain.com/notify" />
              </Form.Item>
            </Form>
          </Col>
          
          {/* 右侧：插件配置 */}
          <Col xs={24} md={12}>
            {/* 固定标题 */}
            <div style={isMobile ? {} : { borderLeft: '1px solid #f0f0f0', paddingLeft: 24 }}>
              <Divider orientation="left" orientationMargin={0}>
                <SafetyCertificateOutlined style={{ marginRight: 8 }} />
                {currentPlugin ? `${currentPlugin.showname} 配置` : '插件配置'}
              </Divider>
            </div>
            {/* 可滚动内容区域 */}
            <div style={{ 
              borderLeft: isMobile ? 'none' : '1px solid #f0f0f0', 
              paddingLeft: isMobile ? 0 : 24,
              height: isMobile ? 'auto' : 530,
              overflowY: isMobile ? 'visible' : 'auto',
              overflowX: 'hidden',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }} className="hide-scrollbar">
              {currentPlugin ? (
                <Form 
                  layout="horizontal" 
                  labelCol={{ span: 6 }}
                  wrapperCol={{ span: 17 }}
                >
                  {renderPluginConfigForm()}
                </Form>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: 350,
                  color: '#999'
                }}>
                  <Empty 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span style={{ color: '#999' }}>
                        请先在左侧选择支付插件
                      </span>
                    }
                  />
                </div>
              )}
            </div>
            <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
          </Col>
        </Row>
      </Modal>
    </div>
  )
}

export default Channels

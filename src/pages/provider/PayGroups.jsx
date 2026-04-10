import { useState, useEffect } from 'react'
import { Card, Table, Button, Tag, Modal, Form, Input, Select, InputNumber, Switch, Space, Tabs, message, Popconfirm, Tooltip, Badge, Alert, Divider } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined, StarOutlined, StarFilled } from '@ant-design/icons'
import api from '../../utils/api'

// 通道选择模式
const CHANNEL_MODE = {
  DISABLED: 0,
  RANDOM: -1,
  SEQUENTIAL: -4,
  FIRST: -5,
  GROUP: -3
}

// 通道模式选项
const CHANNEL_MODE_OPTIONS = [
  { value: CHANNEL_MODE.RANDOM, label: '随机可用通道', color: 'blue' },
  { value: CHANNEL_MODE.SEQUENTIAL, label: '顺序轮询', color: 'green' },
  { value: CHANNEL_MODE.FIRST, label: '首个可用', color: 'cyan' },
  { value: CHANNEL_MODE.GROUP, label: '使用轮询组', color: 'purple' },
  { value: 'specific', label: '指定通道', color: 'orange' }
]

// 轮询组模式
const GROUP_MODE_OPTIONS = [
  { value: 0, label: '顺序轮询' },
  { value: 1, label: '加权随机' }
]

function PayGroups() {
  const [activeTab, setActiveTab] = useState('groups')
  
  // 支付组相关状态
  const [groups, setGroups] = useState([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [groupModalVisible, setGroupModalVisible] = useState(false)
  const [groupEditId, setGroupEditId] = useState(null)
  const [groupForm] = Form.useForm()
  
  // 支付组配置相关
  const [configModalVisible, setConfigModalVisible] = useState(false)
  const [currentGroup, setCurrentGroup] = useState(null)
  const [payTypes, setPayTypes] = useState([])
  const [channels, setChannels] = useState([])
  const [channelGroups, setChannelGroups] = useState([])
  const [groupConfig, setGroupConfig] = useState({})
  
  // 轮询组相关状态
  const [rollGroups, setRollGroups] = useState([])
  const [rollGroupsLoading, setRollGroupsLoading] = useState(false)
  const [rollGroupModalVisible, setRollGroupModalVisible] = useState(false)
  const [rollGroupEditId, setRollGroupEditId] = useState(null)
  const [rollGroupForm] = Form.useForm()
  const [selectedChannels, setSelectedChannels] = useState([])
  
  // 插件列表
  const [plugins, setPlugins] = useState([])
  
  // 获取支付组列表
  const fetchGroups = async () => {
    setGroupsLoading(true)
    try {
      const res = await api.get('/api/admin/pay/pay-groups')
      if (res.data.code === 0) {
        setGroups(res.data.data || [])
      }
    } catch (error) {
      message.error('获取支付组失败')
    } finally {
      setGroupsLoading(false)
    }
  }
  
  // 获取支付方式
  const fetchPayTypes = async () => {
    try {
      const res = await api.get('/api/admin/pay/pay-types')
      if (res.data.code === 0) {
        setPayTypes(res.data.data || [])
      }
    } catch (error) {
      console.error('获取支付方式失败:', error)
    }
  }
  
  // 获取通道列表
  const fetchChannels = async () => {
    try {
      const res = await api.get('/api/admin/channels')
      if (res.data.code === 0) {
        setChannels(res.data.data || [])
      }
    } catch (error) {
      console.error('获取通道失败:', error)
    }
  }
  
  // 获取轮询组列表
  const fetchRollGroups = async () => {
    setRollGroupsLoading(true)
    try {
      const res = await api.get('/api/admin/pay/channel-groups')
      if (res.data.code === 0) {
        setRollGroups(res.data.data || [])
        setChannelGroups(res.data.data || [])
      }
    } catch (error) {
      message.error('获取轮询组失败')
    } finally {
      setRollGroupsLoading(false)
    }
  }
  
  // 获取插件列表
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
  
  // 获取插件中文名
  const getPluginShowName = (pluginName) => {
    const plugin = plugins.find(p => p.name === pluginName)
    return plugin?.showname || pluginName
  }
  
  useEffect(() => {
    fetchPayTypes()
    fetchChannels()
    fetchGroups()
    fetchRollGroups()
    fetchPlugins()
  }, [])
  
  // ============ 支付组管理============
  
  const showGroupModal = (record = null) => {
    setGroupEditId(record?.id || null)
    groupForm.setFieldsValue({
      name: record?.name || '',
      is_default: record?.is_default || false
    })
    setGroupModalVisible(true)
  }
  
  const handleGroupSubmit = async () => {
    try {
      const values = await groupForm.validateFields()
      const url = groupEditId 
        ? '/api/admin/pay/pay-groups/update'
        : '/api/admin/pay/pay-groups/create'
      
      const res = await api.post(url, {
        id: groupEditId,
        ...values,
        is_default: values.is_default ? 1 : 0
      })
      
      if (res.data.code === 0) {
        message.success(groupEditId ? '更新成功' : '创建成功')
        setGroupModalVisible(false)
        fetchGroups()
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      if (!error.errorFields) {
        message.error('操作失败')
      }
    }
  }
  
  const handleSetDefault = async (id) => {
    try {
      const res = await api.post('/api/admin/pay/pay-groups/set-default', { id })
      if (res.data.code === 0) {
        message.success('设置成功')
        fetchGroups()
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('设置失败')
    }
  }
  
  const handleDeleteGroup = async (id) => {
    try {
      const res = await api.post('/api/admin/pay/pay-groups/delete', { id })
      if (res.data.code === 0) {
        message.success('删除成功')
        fetchGroups()
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('删除失败')
    }
  }
  
  // 配置支付组
  const showConfigModal = async (record) => {
    setCurrentGroup(record)
    setGroupConfig(record.config || {})
    setConfigModalVisible(true)
  }
  
  const handleConfigSubmit = async () => {
    // 校验所有支付方式的费率必填
    for (const [payTypeId, config] of Object.entries(groupConfig)) {
      if (config.rate === undefined || config.rate === null) {
        const pt = payTypes.find(p => p.id === parseInt(payTypeId))
        message.error(`请设置 {pt?.showname || '支付方式'}的费率`)
        return
      }
      // 校验轮询组模式必须选择轮询组
      if (config.channel_mode === CHANNEL_MODE.GROUP && !config.group_id) {
        const pt = payTypes.find(p => p.id === parseInt(payTypeId))
        message.error(`请为${pt?.showname || '支付方式'}选择轮询组`)
        return
      }
    }
    
    try {
      const res = await api.post('/api/admin/pay/pay-groups/update', {
        id: currentGroup.id,
        config: groupConfig
      })
      
      if (res.data.code === 0) {
        message.success('保存成功')
        setConfigModalVisible(false)
        fetchGroups()
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('保存失败')
    }
  }
  
  const updateTypeConfig = (typeId, field, value) => {
    setGroupConfig(prev => ({
      ...prev,
      [typeId]: {
        ...prev[typeId],
        [field]: value
      }
    }))
  }
  
  // ============ 轮询组管理============
  
  const showRollGroupModal = (record = null) => {
    setRollGroupEditId(record?.id || null)
    rollGroupForm.setFieldsValue({
      name: record?.name || '',
      mode: record?.mode || 0
    })
    setSelectedChannels(record?.channels || [])
    setRollGroupModalVisible(true)
  }
  
  const handleRollGroupSubmit = async () => {
    try {
      const values = await rollGroupForm.validateFields()
      
      if (selectedChannels.length === 0) {
        message.error('请至少选择一个通道')
        return
      }
      
      const url = rollGroupEditId 
        ? '/api/admin/pay/channel-groups/update'
        : '/api/admin/pay/channel-groups/create'
      
      const res = await api.post(url, {
        id: rollGroupEditId,
        ...values,
        channels: selectedChannels
      })
      
      if (res.data.code === 0) {
        message.success(rollGroupEditId ? '更新成功' : '创建成功')
        setRollGroupModalVisible(false)
        fetchRollGroups()
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      if (!error.errorFields) {
        message.error('操作失败')
      }
    }
  }
  
  const handleDeleteRollGroup = async (id) => {
    try {
      const res = await api.post('/api/admin/pay/channel-groups/delete', { id })
      if (res.data.code === 0) {
        message.success('删除成功')
        fetchRollGroups()
      } else {
        message.error(res.data.msg)
      }
    } catch (error) {
      message.error('删除失败')
    }
  }
  
  const addChannelToGroup = (channelId) => {
    if (selectedChannels.find(c => c.id === channelId)) {
      message.warning('该通道已添加')
      return
    }
    setSelectedChannels([...selectedChannels, { id: channelId, weight: 1 }])
  }
  
  const removeChannelFromGroup = (channelId) => {
    setSelectedChannels(selectedChannels.filter(c => c.id !== channelId))
  }
  
  const updateChannelWeight = (channelId, weight) => {
    setSelectedChannels(selectedChannels.map(c => 
      c.id === channelId ? { ...c, weight } : c
    ))
  }
  
  // 获取所有可用通道（轮询组不限制支付方式）
  const getAllChannels = () => {
    return channels.filter(c => c.status === 1)
  }
  
  // 支付组表格列
  const groupColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { 
      title: '组名称', 
      dataIndex: 'name',
      render: (v, row) => (
        <Space>
          {v}
          {row.is_default === 1 && <Tag color="gold"><StarFilled /> 默认</Tag>}
        </Space>
      )
    },
    {
      title: '配置状态',
      render: (_, row) => {
        const configCount = Object.keys(row.config || {}).length
        return configCount > 0 
          ? <Tag color="green">已配置 {configCount} 种支付方式</Tag>
          : <Tag color="default">未配置</Tag>
      }
    },
    { 
      title: '创建时间', 
      dataIndex: 'created_at',
      width: 180
    },
    {
      title: '操作',
      width: 280,
      render: (_, row) => (
        <Space>
          <Button type="link" size="small" icon={<SettingOutlined />} onClick={() => showConfigModal(row)}>
            配置
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => showGroupModal(row)}>
            编辑
          </Button>
          {row.is_default !== 1 && (
            <Button type="link" size="small" icon={<StarOutlined />} onClick={() => handleSetDefault(row.id)}>
              设为默认
            </Button>
          )}
          {row.is_default !== 1 && (
            <Popconfirm title="确定删除此支付组?" onConfirm={() => handleDeleteGroup(row.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]
  
  // 轮询组表格列
  const rollGroupColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '组名称', dataIndex: 'name' },
    {
      title: '轮询模式',
      dataIndex: 'mode',
      render: (v) => GROUP_MODE_OPTIONS.find(o => o.value === v)?.label || '-'
    },
    {
      title: '包含通道',
      render: (_, row) => {
        const channelList = row.channels || []
        if (channelList.length === 0) return '-'
        return (
          <Space wrap size={[4, 4]}>
            {channelList.slice(0, 3).map(c => {
              const ch = channels.find(ch => ch.id === c.id)
              return ch ? (
                <Tag key={c.id}>{ch.channel_name || ch.name}</Tag>
              ) : null
            })}
            {channelList.length > 3 && <Tag>+{channelList.length - 3}</Tag>}
          </Space>
        )
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v) => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? '启用' : '禁用'}</Tag>
    },
    {
      title: '操作',
      render: (_, row) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => showRollGroupModal(row)}>编辑</Button>
          <Popconfirm title="确定删除此轮询组?" onConfirm={() => handleDeleteRollGroup(row.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ]
  
  return (
    <div>
      <h2 className="page-title">支付组管理</h2>
      
      <Alert 
        message="支付组说明" 
        description="支付组用于配置不同商户的支付通道分配策略。可以为不同商户设置不同的支付组，新商户默认使用标记为「默认」的支付组。每种支付方式可以配置使用指定通道、轮询组或随机顺序选择。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'groups',
            label: '支付组',
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => showGroupModal()}>
                    新建支付组
                  </Button>
                </div>
                <Table
                  columns={groupColumns}
                  dataSource={groups}
                  loading={groupsLoading}
                  rowKey="id"
                  pagination={false}
                  bordered
                  size="middle"
                />
              </>
            )
          },
          {
            key: 'rollGroups',
            label: '通道轮询组',
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => showRollGroupModal()}>
                    新建轮询组
                  </Button>
                </div>
                <Table
                  columns={rollGroupColumns}
                  dataSource={rollGroups}
                  loading={rollGroupsLoading}
                  rowKey="id"
                  pagination={false}
                  bordered
                  size="middle"
                />
              </>
            )
          }
        ]}
      />
      
      {/* 新建/编辑支付组弹窗 */}
      <Modal
        title={groupEditId ? '编辑支付组' : '新建支付组'}
        open={groupModalVisible}
        onCancel={() => setGroupModalVisible(false)}
        onOk={handleGroupSubmit}
        width={500}
      >
        <Form form={groupForm} layout="vertical">
          <Form.Item
            name="name"
            label="组名称"
            rules={[{ required: true, message: '请输入组名称' }]}
          >
            <Input placeholder="例如：默认组、VIP商户组" />
          </Form.Item>
          <Form.Item
            name="is_default"
            label="设为默认组"
            valuePropName="checked"
            extra="新接入的商户将自动使用默认组的配置"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
      
      {/* 支付组配置弹窗 */}
      <Modal
        title={`配置支付组 - ${currentGroup?.name || ''}`}
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        onOk={handleConfigSubmit}
        width={800}
        styles={{ body: { maxHeight: '60vh', overflowY: 'auto' } }}
      >
        <Alert 
          message="费率优先级：商户费率 > 支付组费率；每个支付方式必须设置费率"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        {/* 已添加的支付方式列表 */}
        {Object.keys(groupConfig).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            暂未添加任何支付方式，请从下方添加
          </div>
        ) : (
          Object.entries(groupConfig).map(([payTypeId, typeConfig]) => {
            const pt = payTypes.find(p => p.id === parseInt(payTypeId))
            if (!pt) return null
            
            // 只显示支持该支付类型的启用通道（支持多类型）
            const typeChannels = channels.filter(c => {
              if (c.status !== 1) return false
              const channelTypes = c.pay_type ? c.pay_type.split(',') : []
              return channelTypes.includes(pt.name)
            })
            // 轮询组不限制支付方式，显示所有可用轮询组
            const allRollGroups = channelGroups.filter(g => g.status === 1)
            const isSpecificChannel = typeConfig.channel_mode > 0
            
            return (
              <Card 
                key={payTypeId} 
                size="small" 
                title={
                  <Space>
                    <img src={`/assets/icon/${pt.name}.ico`} alt="" style={{ width: 20 }} />
                    {pt.showname}
                    {typeChannels.length === 0 && <Tag color="red">无可用通道</Tag>}
                  </Space>
                }
                extra={
                  <Button 
                    type="link" 
                    danger 
                    size="small"
                    onClick={() => {
                      const newConfig = { ...groupConfig }
                      delete newConfig[payTypeId]
                      setGroupConfig(newConfig)
                    }}
                  >
                    删除
                  </Button>
                }
                style={{ marginBottom: 12 }}
              >
                <Space wrap style={{ width: '100%' }}>
                  <span>通道模式：</span>
                  <Select
                    value={isSpecificChannel ? 'specific' : (typeConfig.channel_mode ?? CHANNEL_MODE.RANDOM)}
                    onChange={(v) => {
                      if (v === 'specific') {
                        const firstChannel = typeChannels[0]
                        if (firstChannel) {
                          updateTypeConfig(parseInt(payTypeId), 'channel_mode', firstChannel.id)
                        }
                      } else {
                        updateTypeConfig(parseInt(payTypeId), 'channel_mode', v)
                      }
                    }}
                    style={{ width: 150 }}
                    options={CHANNEL_MODE_OPTIONS}
                  />
                  
                  {isSpecificChannel && (
                    <>
                      <span>通道：</span>
                      <Select
                        value={typeConfig.channel_mode}
                        onChange={(v) => updateTypeConfig(parseInt(payTypeId), 'channel_mode', v)}
                        style={{ width: 190 }}
                        placeholder="选择通道"
                        options={typeChannels.map(c => ({
                          value: c.id,
                          label: `${c.channel_name || c.name} (${c.plugin_name || c.plugin})`
                        }))}
                      />
                    </>
                  )}
                  
                  {typeConfig.channel_mode === CHANNEL_MODE.GROUP && (
                    <>
                      <span>轮询组：</span>
                      <Select
                        value={typeConfig.group_id}
                        onChange={(v) => updateTypeConfig(parseInt(payTypeId), 'group_id', v)}
                        style={{ width: 190 }}
                        placeholder="选择轮询组"
                        options={allRollGroups.map(g => ({
                          value: g.id,
                          label: g.name
                        }))}
                      />
                    </>
                  )}
                  
                  {/* 费率设置 - 必填 */}
                  <span style={{ color: '#ff4d4f' }}>*</span>
                  <span>费率：</span>
                  <InputNumber
                    value={typeConfig.rate}
                    onChange={(v) => updateTypeConfig(parseInt(payTypeId), 'rate', v)}
                    min={0}
                    max={100}
                    step={0.01}
                    addonAfter="%"
                    placeholder="必填"
                    style={{ width: 130 }}
                    status={typeConfig.rate === undefined || typeConfig.rate === null ? 'error' : ''}
                  />
                </Space>
              </Card>
            )
          })
        )}
        
        {/* 底部添加横幅 - 只显示有启用通道的支付类型 */}
        {(() => {
          const enabledChannels = channels.filter(c => c.status === 1)
          const availableTypes = payTypes
            .filter(pt => !groupConfig[pt.id])
            .filter(pt => enabledChannels.some(c => {
              const channelTypes = c.pay_type ? c.pay_type.split(',') : []
              return channelTypes.includes(pt.name)
            }))
          
          if (availableTypes.length === 0) return null
          
          return (
            <Card 
              size="small" 
              style={{ 
                borderStyle: 'dashed', 
                background: '#fafafa',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <PlusOutlined style={{ color: '#1890ff' }} />
                <span style={{ color: '#666', marginRight: 8 }}>添加支付方式：</span>
                {availableTypes.map(pt => (
                  <Tag 
                    key={pt.id}
                    style={{ cursor: 'pointer', margin: '2px 4px' }}
                    onClick={() => {
                      setGroupConfig(prev => ({
                        ...prev,
                        [pt.id]: { channel_mode: CHANNEL_MODE.RANDOM }
                      }))
                    }}
                  >
                    <Space size={4}>
                      <img src={`/assets/icon/${pt.name}.ico`} alt="" style={{ width: 14, height: 14 }} />
                      {pt.showname}
                      <PlusOutlined style={{ fontSize: 10 }} />
                    </Space>
                  </Tag>
                ))}
              </div>
            </Card>
          )
        })()}
      </Modal>
      
      {/* 新建/编辑轮询组弹窗 */}
      <Modal
        title={rollGroupEditId ? '编辑轮询组' : '新建轮询组'}
        open={rollGroupModalVisible}
        onCancel={() => setRollGroupModalVisible(false)}
        onOk={handleRollGroupSubmit}
        width={700}
      >
        <Alert 
          message="轮询组可包含任意通道，不限制支付方式。在支付组中配置某个支付方式使用此轮询组后，系统会按照轮询模式选择其中的通道发起支付。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Form form={rollGroupForm} layout="vertical">
          <Form.Item
            name="name"
            label="轮询组名称"
            rules={[{ required: true, message: '请输入轮询组名称' }]}
          >
            <Input placeholder="例如：主力通道组" />
          </Form.Item>
          
          <Form.Item
            name="mode"
            label="轮询模式"
          >
            <Select options={GROUP_MODE_OPTIONS} />
          </Form.Item>
          
          <Divider>通道配置</Divider>
          
          <Form.Item label="添加通道">
            <Select
              placeholder="选择要添加的通道"
              style={{ width: '100%' }}
              onChange={(v) => { addChannelToGroup(v) }}
              value={null}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children || '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {getAllChannels().map(c => {
                const pluginName = c.plugin_name || c.plugin
                const pluginShowName = getPluginShowName(pluginName)
                return (
                  <Select.Option 
                    key={c.id} 
                    value={c.id}
                    disabled={selectedChannels.find(sc => sc.id === c.id)}
                  >
                    {c.channel_name || c.name} - {pluginShowName} ({pluginName})
                  </Select.Option>
                )
              })}
            </Select>
          </Form.Item>
          
          {selectedChannels.length > 0 && (
            <Table
              size="small"
              dataSource={selectedChannels}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: '通道',
                  dataIndex: 'id',
                  render: (id) => {
                    const channel = channels.find(c => c.id === id)
                    if (!channel) return id
                    const pluginName = channel.plugin_name || channel.plugin
                    const pluginShowName = getPluginShowName(pluginName)
                    return (
                      <Space>
                        <Tag color="blue">{pluginShowName}</Tag>
                        {channel.channel_name || channel.name}
                      </Space>
                    )
                  }
                },
                {
                  title: '权重',
                  dataIndex: 'weight',
                  width: 120,
                  render: (v, row) => (
                    <InputNumber
                      value={v}
                      min={1}
                      max={100}
                      onChange={(val) => updateChannelWeight(row.id, val)}
                      style={{ width: 80 }}
                    />
                  )
                },
                {
                  title: '操作',
                  width: 80,
                  render: (_, row) => (
                    <Button 
                      type="link" 
                      danger 
                      size="small"
                      onClick={() => removeChannelFromGroup(row.id)}
                    >
                      移除
                    </Button>
                  )
                }
              ]}
            />
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default PayGroups

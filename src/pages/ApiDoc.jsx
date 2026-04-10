import { useState } from 'react'
import { Anchor, Tabs, Table, Tag, Alert, Card, Space } from 'antd'
import { LinkOutlined, DownloadOutlined } from '@ant-design/icons'
import styles from './ApiDoc.module.css'

const { TabPane } = Tabs

function ApiDoc() {
  const [activeTab, setActiveTab] = useState('v2')

  // V2 接口目录
  const v2Anchors = [
    { key: 'v2-intro', href: '#v2-intro', title: '接口说明' },
    { key: 'v2-sign', href: '#v2-sign', title: '签名规则' },
    { key: 'v2-paytype', href: '#v2-paytype', title: '支付方式列表' },
    {
      key: 'v2-pay',
      href: '#v2-pay',
      title: '支付相关接口',
      children: [
        { key: 'v2-pay-submit', href: '#v2-pay-submit', title: '页面跳转支付' },
        { key: 'v2-pay-create', href: '#v2-pay-create', title: '统一下单接口' },
        { key: 'v2-pay-query', href: '#v2-pay-query', title: '订单查询' },
        { key: 'v2-pay-notify', href: '#v2-pay-notify', title: '支付结果通知' },
      ],
    },
    { key: 'v2-sdk', href: '#v2-sdk', title: 'SDK下载' },
  ]

  // V1 接口目录
  const v1Anchors = [
    { key: 'v1-intro', href: '#v1-intro', title: '协议规则' },
    { key: 'v1-pay-submit', href: '#v1-pay-submit', title: '页面跳转支付' },
    { key: 'v1-pay-api', href: '#v1-pay-api', title: 'API接口支付' },
    { key: 'v1-pay-notify', href: '#v1-pay-notify', title: '支付结果通知' },
    { key: 'v1-sign', href: '#v1-sign', title: 'MD5签名算法' },
    { key: 'v1-paytype', href: '#v1-paytype', title: '支付方式列表' },
    { key: 'v1-device', href: '#v1-device', title: '设备类型列表' },
    { key: 'v1-api-order', href: '#v1-api-order', title: '查询单个订单' },
    { key: 'v1-sdk', href: '#v1-sdk', title: 'SDK下载' },
  ]

  // 表格列定义
  const paramColumns = [
    { title: '字段名', dataIndex: 'name', key: 'name' },
    { title: '变量名', dataIndex: 'field', key: 'field' },
    { title: '必填', dataIndex: 'required', key: 'required', render: (val) => val ? <Tag color="red">是</Tag> : <Tag>否</Tag> },
    { title: '类型', dataIndex: 'type', key: 'type' },
    { title: '示例值', dataIndex: 'example', key: 'example' },
    { title: '描述', dataIndex: 'desc', key: 'desc' },
  ]

  const responseColumns = [
    { title: '字段名', dataIndex: 'name', key: 'name' },
    { title: '变量名', dataIndex: 'field', key: 'field' },
    { title: '类型', dataIndex: 'type', key: 'type' },
    { title: '示例值', dataIndex: 'example', key: 'example' },
    { title: '描述', dataIndex: 'desc', key: 'desc' },
  ]

  return (
    <div className={styles.apiDoc}>
      {/* 页面标题区 */}
      <div className={styles.pageTitle}>
        <div className={styles.pageTitleContainer}>
          <h1>API 开发文档</h1>
          <p>快速接入支付接口，查看详细的接口文档和示例代码</p>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarFixed}>
            <Tabs activeKey={activeTab} onChange={setActiveTab} className={styles.versionTabs}>
              <TabPane tab="V2接口文档" key="v2">
                <Anchor items={v2Anchors} offsetTop={80} />
              </TabPane>
              <TabPane tab="V1接口文档（旧版）" key="v1">
                <Anchor items={v1Anchors} offsetTop={80} />
              </TabPane>
            </Tabs>
          </div>
        </div>

        <div className={styles.content}>
          {activeTab === 'v2' && (
            <div className={styles.docContent}>
              {/* V2 接口说明 */}
              <section id="v2-intro" className={styles.section}>
                <h2>接口说明及规范</h2>
                
                <h3>协议规则</h3>
                <ul>
                  <li>提交数据格式：<code>application/x-www-form-urlencoded</code></li>
                  <li>返回数据格式：<code>JSON</code></li>
                  <li>字符编码：<code>UTF-8</code></li>
                  <li>签名算法：<code>SHA256WithRSA</code></li>
                </ul>

                <h3>V2升级说明</h3>
                <ol>
                  <li>V2接口全面使用 RSA 签名算法；V1接口使用 MD5 签名算法</li>
                  <li>V2接口改用全新的接口地址，支持退款、代付等功能；V1接口使用submit.php和mapi.php提交订单</li>
                  <li>V2接口新增timestamp入参和返回值用于校验时间戳</li>
                </ol>

                <h3>获取RSA密钥对</h3>
                <p>在 商户后台→个人资料→API信息 页面，点击【生成商户RSA密钥对】，生成后注意保存【商户私钥】。对接接口时只需要用到【平台公钥】与【商户私钥】。</p>
                
                <Alert 
                  message="重要提示" 
                  description="请妥善保管您的商户私钥，不要泄露给他人。平台公钥用于验证平台返回数据的签名。"
                  type="info" 
                  showIcon 
                  style={{ marginTop: 16 }}
                />
              </section>

              {/* V2 签名规则 */}
              <section id="v2-sign" className={styles.section}>
                <h2>RSA签名规则</h2>
                
                <h3>签名步骤</h3>
                <ol>
                  <li>将所有请求参数按照参数名ASCII码从小到大排序（字典序）</li>
                  <li>排除 sign 参数和空值参数</li>
                  <li>将排序后的参数拼接成 URL 键值对格式，例如：<code>a=value1&b=value2&c=value3</code></li>
                  <li>使用商户私钥对拼接好的字符串进行 SHA256WithRSA 签名</li>
                  <li>将签名结果进行 Base64 编码得到最终的 sign 值</li>
                </ol>

                <h3>验签步骤</h3>
                <ol>
                  <li>接收平台返回的数据，提取出 sign 参数</li>
                  <li>将其他参数按照签名步骤 1-3 的方式处理</li>
                  <li>使用平台公钥对拼接好的字符串和 sign 进行验签</li>
                </ol>

                <Alert 
                  message="签名示例" 
                  description="详细的签名代码示例请下载SDK查看，支持PHP、Java、Python等多种语言。"
                  type="info" 
                  showIcon 
                  style={{ marginTop: 16 }}
                />
              </section>

              {/* V2 支付方式列表 */}
              <section id="v2-paytype" className={styles.section}>
                <h2>支付方式列表</h2>
                <Table
                  columns={[
                    { title: '支付方式', dataIndex: 'code', key: 'code' },
                    { title: '名称', dataIndex: 'name', key: 'name' },
                  ]}
                  dataSource={[
                    { key: '1', code: 'alipay', name: '支付宝' },
                    { key: '2', code: 'wxpay', name: '微信支付' },
                    { key: '3', code: 'qqpay', name: 'QQ钱包' },
                    { key: '4', code: 'bank', name: '网银支付' },
                    { key: '5', code: 'crypto', name: '数字货币' },
                  ]}
                  pagination={false}
                />
              </section>

              {/* V2 支付相关接口 */}
              <section id="v2-pay" className={styles.section}>
                <h2>支付相关接口</h2>

                {/* 页面跳转支付 */}
                <div id="v2-pay-submit" className={styles.apiBlock}>
                  <h3><LinkOutlined /> 页面跳转支付</h3>
                  <p className={styles.desc}>此接口用于用户前台直接发起支付，跳转到支付页面完成支付。</p>
                  
                  <Card size="small" title="基本信息" style={{ marginBottom: 16 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div><strong>接口地址：</strong><code className={styles.url}>/api/pay/submit</code></div>
                      <div><strong>请求方式：</strong><Tag color="blue">POST</Tag> / <Tag color="green">GET</Tag></div>
                      <div><strong>返回格式：</strong><code>跳转到支付页面</code></div>
                    </Space>
                  </Card>

                  <h4>请求参数</h4>
                  <Table
                    columns={paramColumns}
                    dataSource={[
                      { key: '1', name: '商户ID', field: 'mch_id', required: true, type: 'String', example: '10001', desc: '商户ID' },
                      { key: '2', name: '商户订单号', field: 'out_trade_no', required: true, type: 'String', example: '20231130001', desc: '商户系统内部订单号' },
                      { key: '3', name: '支付方式', field: 'pay_type', required: false, type: 'String', example: 'alipay', desc: '不传则跳转到收银台' },
                      { key: '4', name: '订单金额', field: 'total_amount', required: true, type: 'Decimal', example: '100.00', desc: '订单总金额，单位：元' },
                      { key: '5', name: '商品标题', field: 'subject', required: true, type: 'String', example: 'VIP会员', desc: '商品标题' },
                      { key: '6', name: '异步通知地址', field: 'notify_url', required: true, type: 'String', example: 'https://your.com/notify', desc: '支付结果通知地址' },
                      { key: '7', name: '同步跳转地址', field: 'return_url', required: true, type: 'String', example: 'https://your.com/return', desc: '支付完成跳转地址' },
                      { key: '8', name: '附加参数', field: 'attach', required: false, type: 'String', example: 'custom_data', desc: '原样返回' },
                      { key: '9', name: '买家身份证号', field: 'cert_no', required: false, type: 'String', example: '110101199001011234', desc: '要求买家身份证号（仅支付宝官方接口有效）' },
                      { key: '10', name: '买家姓名', field: 'cert_name', required: false, type: 'String', example: '张三', desc: '要求买家姓名（仅支付宝官方接口有效）' },
                      { key: '11', name: '最小年龄', field: 'min_age', required: false, type: 'Integer', example: '18', desc: '要求买家最小年龄（仅支付宝官方接口有效）' },
                      { key: '12', name: '时间戳', field: 'timestamp', required: true, type: 'Long', example: '1701331200', desc: 'Unix时间戳（秒）' },
                      { key: '13', name: '签名', field: 'sign', required: true, type: 'String', example: 'xxx', desc: 'RSA签名值' },
                    ]}
                    pagination={false}
                  />
                </div>

                {/* 统一下单接口 */}
                <div id="v2-pay-create" className={styles.apiBlock}>
                  <h3><LinkOutlined /> 统一下单接口</h3>
                  <p className={styles.desc}>此接口用于服务端发起支付，返回支付二维码或跳转链接。</p>
                  
                  <Card size="small" title="基本信息" style={{ marginBottom: 16 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div><strong>接口地址：</strong><code className={styles.url}>/api/pay/create</code></div>
                      <div><strong>请求方式：</strong><Tag color="blue">POST</Tag></div>
                      <div><strong>返回格式：</strong><code>JSON</code></div>
                    </Space>
                  </Card>

                  <h4>请求参数</h4>
                  <Table
                    columns={paramColumns}
                    dataSource={[
                      { key: '1', name: '商户ID', field: 'mch_id', required: true, type: 'String', example: '10001', desc: '商户ID' },
                      { key: '2', name: '商户订单号', field: 'out_trade_no', required: true, type: 'String', example: '20231130001', desc: '商户系统内部订单号' },
                      { key: '3', name: '支付方式', field: 'pay_type', required: true, type: 'String', example: 'alipay', desc: '支付方式代码' },
                      { key: '4', name: '订单金额', field: 'total_amount', required: true, type: 'Decimal', example: '100.00', desc: '订单总金额，单位：元' },
                      { key: '5', name: '商品标题', field: 'subject', required: true, type: 'String', example: 'VIP会员', desc: '商品标题' },
                      { key: '6', name: '异步通知地址', field: 'notify_url', required: true, type: 'String', example: 'https://your.com/notify', desc: '支付结果通知地址' },
                      { key: '7', name: '同步跳转地址', field: 'return_url', required: false, type: 'String', example: 'https://your.com/return', desc: '支付完成跳转地址' },
                      { key: '8', name: '用户IP', field: 'client_ip', required: true, type: 'String', example: '192.168.1.1', desc: '用户IP地址' },
                      { key: '9', name: '附加参数', field: 'attach', required: false, type: 'String', example: 'custom_data', desc: '原样返回' },
                      { key: '10', name: '买家身份证号', field: 'cert_no', required: false, type: 'String', example: '110101199001011234', desc: '要求买家身份证号（仅支付宝官方接口有效）' },
                      { key: '11', name: '买家姓名', field: 'cert_name', required: false, type: 'String', example: '张三', desc: '要求买家姓名（仅支付宝官方接口有效）' },
                      { key: '12', name: '最小年龄', field: 'min_age', required: false, type: 'Integer', example: '18', desc: '要求买家最小年龄（仅支付宝官方接口有效）' },
                      { key: '13', name: '时间戳', field: 'timestamp', required: true, type: 'Long', example: '1701331200', desc: 'Unix时间戳（秒）' },
                      { key: '14', name: '签名', field: 'sign', required: true, type: 'String', example: 'xxx', desc: 'RSA签名值' },
                    ]}
                    pagination={false}
                  />

                  <h4>返回参数</h4>
                  <Table
                    columns={responseColumns}
                    dataSource={[
                      { key: '1', name: '状态码', field: 'code', type: 'Integer', example: '0', desc: '0表示成功' },
                      { key: '2', name: '消息', field: 'msg', type: 'String', example: 'success', desc: '返回消息' },
                      { key: '3', name: '平台订单号', field: 'trade_no', type: 'String', example: '20231130001', desc: '平台订单号' },
                      { key: '4', name: '支付链接', field: 'pay_url', type: 'String', example: 'https://...', desc: '支付页面链接' },
                      { key: '5', name: '二维码链接', field: 'qr_code', type: 'String', example: 'weixin://...', desc: '支付二维码内容' },
                      { key: '6', name: '时间戳', field: 'timestamp', type: 'Long', example: '1701331200', desc: 'Unix时间戳（秒）' },
                      { key: '7', name: '签名', field: 'sign', type: 'String', example: 'xxx', desc: 'RSA签名值' },
                    ]}
                    pagination={false}
                  />

                  <Alert 
                    message="注意事项" 
                    description="pay_url、qr_code 两个参数根据支付方式只会返回其中一个。"
                    type="info" 
                    showIcon 
                    style={{ marginTop: 16 }}
                  />
                </div>

                {/* 订单查询 */}
                <div id="v2-pay-query" className={styles.apiBlock}>
                  <h3><LinkOutlined /> 订单查询</h3>
                  <p className={styles.desc}>查询订单支付状态。</p>
                  
                  <Card size="small" title="基本信息" style={{ marginBottom: 16 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div><strong>接口地址：</strong><code className={styles.url}>/api/pay/query</code></div>
                      <div><strong>请求方式：</strong><Tag color="blue">POST</Tag></div>
                      <div><strong>返回格式：</strong><code>JSON</code></div>
                    </Space>
                  </Card>

                  <h4>请求参数</h4>
                  <Table
                    columns={paramColumns}
                    dataSource={[
                      { key: '1', name: '商户ID', field: 'mch_id', required: true, type: 'String', example: '10001', desc: '商户ID' },
                      { key: '2', name: '平台订单号', field: 'trade_no', required: false, type: 'String', example: '20231130001', desc: '平台订单号' },
                      { key: '3', name: '商户订单号', field: 'out_trade_no', required: false, type: 'String', example: '20231130001', desc: '商户订单号' },
                      { key: '4', name: '时间戳', field: 'timestamp', required: true, type: 'Long', example: '1701331200', desc: 'Unix时间戳（秒）' },
                      { key: '5', name: '签名', field: 'sign', required: true, type: 'String', example: 'xxx', desc: 'RSA签名值' },
                    ]}
                    pagination={false}
                  />

                  <Alert 
                    message="注意" 
                    description="trade_no 和 out_trade_no 二选一，如果都传以 trade_no 为准。"
                    type="info" 
                    showIcon 
                    style={{ marginTop: 16 }}
                  />
                </div>

                {/* 支付结果通知 */}
                <div id="v2-pay-notify" className={styles.apiBlock}>
                  <h3><LinkOutlined /> 支付结果通知</h3>
                  <p className={styles.desc}>支付成功后，平台会向商户的异步通知地址发送支付结果通知。</p>
                  
                  <Card size="small" title="基本信息" style={{ marginBottom: 16 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div><strong>通知方式：</strong><Tag color="blue">POST</Tag></div>
                      <div><strong>通知格式：</strong><code>application/x-www-form-urlencoded</code></div>
                    </Space>
                  </Card>

                  <h4>通知参数</h4>
                  <Table
                    columns={responseColumns}
                    dataSource={[
                      { key: '1', name: '商户ID', field: 'mch_id', type: 'String', example: '10001', desc: '商户ID' },
                      { key: '2', name: '平台订单号', field: 'trade_no', type: 'String', example: '20231130001', desc: '平台订单号' },
                      { key: '3', name: '商户订单号', field: 'out_trade_no', type: 'String', example: '20231130001', desc: '商户订单号' },
                      { key: '4', name: '支付方式', field: 'pay_type', type: 'String', example: 'alipay', desc: '支付方式' },
                      { key: '5', name: '订单金额', field: 'total_amount', type: 'Decimal', example: '100.00', desc: '订单金额' },
                      { key: '6', name: '实付金额', field: 'buyer_pay_amount', type: 'Decimal', example: '100.00', desc: '实际支付金额' },
                      { key: '7', name: '订单状态', field: 'trade_status', type: 'String', example: 'TRADE_SUCCESS', desc: 'TRADE_SUCCESS为成功' },
                      { key: '8', name: '附加参数', field: 'attach', type: 'String', example: 'custom_data', desc: '下单时传入的附加参数' },
                      { key: '9', name: '时间戳', field: 'timestamp', type: 'Long', example: '1701331200', desc: 'Unix时间戳（秒）' },
                      { key: '10', name: '签名', field: 'sign', type: 'String', example: 'xxx', desc: 'RSA签名值' },
                    ]}
                    pagination={false}
                  />

                  <Alert 
                    message="重要提示" 
                    description={
                      <div>
                        <p>1. 收到通知后必须验证签名，确保通知来自平台</p>
                        <p>2. 验证签名通过后，需要根据订单号查询自己系统的订单状态</p>
                        <p>3. 只有当 trade_status=TRADE_SUCCESS 时才表示支付成功</p>
                        <p>4. 处理成功后必须返回字符串 <code>success</code>，否则平台会重复通知</p>
                      </div>
                    }
                    type="info" 
                    showIcon 
                    style={{ marginTop: 16 }}
                  />
                </div>

              </section>

              {/* V2 SDK下载 */}
              <section id="v2-sdk" className={styles.section}>
                <h2>SDK 下载</h2>
                <Card>
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                      <h4><DownloadOutlined /> PHP SDK 2.0</h4>
                      <p>适用于 V2 接口的 PHP SDK</p>
                      <a href="/files/SDK_2.0.zip" target="_blank">
                        <Tag color="blue" style={{ cursor: 'pointer' }}>下载 SDK_2.0.zip</Tag>
                      </a>
                    </div>
                  </Space>
                </Card>
              </section>
            </div>
          )}

          {activeTab === 'v1' && (
            <div className={styles.docContent}>
              {/* V1 协议规则 */}
              <section id="v1-intro" className={styles.section}>
                <h2>协议规则</h2>
                <ul>
                  <li>请求数据格式：<code>application/x-www-form-urlencoded</code></li>
                  <li>返回数据格式：<code>JSON</code></li>
                  <li>签名算法：<code>MD5</code></li>
                  <li>字符编码：<code>UTF-8</code></li>
                </ul>
                
                <Alert 
                  message="旧版接口" 
                  description="V1接口为旧版接口，建议新商户使用V2接口。V1接口将继续维护但不再新增功能。"
                  type="info" 
                  showIcon 
                  style={{ marginTop: 16 }}
                />
              </section>

              {/* V1 页面跳转支付 */}
              <section id="v1-pay-submit" className={styles.section}>
                <h2>页面跳转支付</h2>
                <p className={styles.desc}>此接口可用于用户前台直接发起支付，使用form表单跳转或拼接成url跳转。</p>
                
                <Card size="small" title="基本信息" style={{ marginBottom: 16 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div><strong>接口地址：</strong><code className={styles.url}>/submit.php</code></div>
                    <div><strong>请求方式：</strong><Tag color="blue">POST</Tag> / <Tag color="green">GET</Tag>（推荐POST）</div>
                  </Space>
                </Card>

                <h4>请求参数</h4>
                <Table
                  columns={paramColumns}
                  dataSource={[
                    { key: '1', name: '商户ID', field: 'pid', required: true, type: 'Int', example: '1001', desc: '' },
                    { key: '2', name: '支付方式', field: 'type', required: false, type: 'String', example: 'alipay', desc: '不传会跳转到收银台' },
                    { key: '3', name: '商户订单号', field: 'out_trade_no', required: true, type: 'String', example: '20160806151343349', desc: '' },
                    { key: '4', name: '异步通知地址', field: 'notify_url', required: true, type: 'String', example: 'http://www.pay.com/notify_url.php', desc: '服务器异步通知地址' },
                    { key: '5', name: '跳转通知地址', field: 'return_url', required: true, type: 'String', example: 'http://www.pay.com/return_url.php', desc: '页面跳转通知地址' },
                    { key: '6', name: '商品名称', field: 'name', required: true, type: 'String', example: 'VIP会员', desc: '如超过127个字节会自动截取' },
                    { key: '7', name: '商品金额', field: 'money', required: true, type: 'String', example: '1.00', desc: '单位：元，最大2位小数' },
                    { key: '8', name: '业务扩展参数', field: 'param', required: false, type: 'String', example: '没有请留空', desc: '支付后原样返回' },
                    { key: '9', name: '签名字符串', field: 'sign', required: true, type: 'String', example: '202cb962ac59075b964b07152d234b70', desc: 'MD5签名' },
                    { key: '10', name: '签名类型', field: 'sign_type', required: true, type: 'String', example: 'MD5', desc: '默认为MD5' },
                  ]}
                  pagination={false}
                />
              </section>

              {/* V1 API接口支付 */}
              <section id="v1-pay-api" className={styles.section}>
                <h2>API接口支付</h2>
                <p className={styles.desc}>此接口可用于服务器后端发起支付请求，会返回支付二维码链接或支付跳转url。</p>
                
                <Card size="small" title="基本信息" style={{ marginBottom: 16 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div><strong>接口地址：</strong><code className={styles.url}>/mapi.php</code></div>
                    <div><strong>请求方式：</strong><Tag color="blue">POST</Tag></div>
                    <div><strong>返回格式：</strong><code>JSON</code></div>
                  </Space>
                </Card>

                <h4>请求参数</h4>
                <Table
                  columns={paramColumns}
                  dataSource={[
                    { key: '1', name: '商户ID', field: 'pid', required: true, type: 'Int', example: '1001', desc: '' },
                    { key: '2', name: '支付方式', field: 'type', required: true, type: 'String', example: 'alipay', desc: '' },
                    { key: '3', name: '商户订单号', field: 'out_trade_no', required: true, type: 'String', example: '20160806151343349', desc: '' },
                    { key: '4', name: '异步通知地址', field: 'notify_url', required: true, type: 'String', example: 'http://www.pay.com/notify_url.php', desc: '服务器异步通知地址' },
                    { key: '5', name: '跳转通知地址', field: 'return_url', required: false, type: 'String', example: 'http://www.pay.com/return_url.php', desc: '页面跳转通知地址' },
                    { key: '6', name: '商品名称', field: 'name', required: true, type: 'String', example: 'VIP会员', desc: '如超过127个字节会自动截取' },
                    { key: '7', name: '商品金额', field: 'money', required: true, type: 'String', example: '1.00', desc: '单位：元，最大2位小数' },
                    { key: '8', name: '用户IP地址', field: 'clientip', required: true, type: 'String', example: '192.168.1.100', desc: '用户发起支付的IP地址' },
                    { key: '9', name: '设备类型', field: 'device', required: false, type: 'String', example: 'pc', desc: '根据用户浏览器的UA判断' },
                    { key: '10', name: '业务扩展参数', field: 'param', required: false, type: 'String', example: '没有请留空', desc: '支付后原样返回' },
                    { key: '11', name: '签名字符串', field: 'sign', required: true, type: 'String', example: '202cb962ac59075b964b07152d234b70', desc: 'MD5签名' },
                    { key: '12', name: '签名类型', field: 'sign_type', required: true, type: 'String', example: 'MD5', desc: '默认为MD5' },
                  ]}
                  pagination={false}
                />

                <h4>返回结果</h4>
                <Table
                  columns={responseColumns}
                  dataSource={[
                    { key: '1', name: '返回状态码', field: 'code', type: 'Int', example: '1', desc: '1为成功，其它值为失败' },
                    { key: '2', name: '返回信息', field: 'msg', type: 'String', example: '', desc: '失败时返回原因' },
                    { key: '3', name: '订单号', field: 'trade_no', type: 'String', example: '20160806151343349', desc: '支付订单号' },
                    { key: '4', name: '支付跳转url', field: 'payurl', type: 'String', example: '/pay/wxpay/202010903/', desc: '如果返回该字段，则直接跳转到该url支付' },
                    { key: '5', name: '二维码链接', field: 'qrcode', type: 'String', example: 'weixin://wxpay/bizpayurl?pr=04IPMKM', desc: '如果返回该字段，则根据该url生成二维码' },
                    { key: '6', name: '小程序跳转url', field: 'urlscheme', type: 'String', example: 'weixin://dl/business/?ticket=xxx', desc: '如果返回该字段，则使用js跳转该url' },
                  ]}
                  pagination={false}
                />

                <Alert 
                  message="注意事项" 
                  description="payurl、qrcode、urlscheme 三个参数只会返回其中一个。"
                  type="info" 
                  showIcon 
                  style={{ marginTop: 16 }}
                />
              </section>

              {/* V1 支付结果通知 */}
              <section id="v1-pay-notify" className={styles.section}>
                <h2>支付结果通知</h2>
                <p>通知类型：服务器异步通知（notify_url）、页面跳转通知（return_url）</p>
                <p>请求方式：GET</p>

                <h4>通知参数</h4>
                <Table
                  columns={paramColumns}
                  dataSource={[
                    { key: '1', name: '商户ID', field: 'pid', required: true, type: 'Int', example: '1001', desc: '' },
                    { key: '2', name: '易支付订单号', field: 'trade_no', required: true, type: 'String', example: '20160806151343349021', desc: '平台订单号' },
                    { key: '3', name: '商户订单号', field: 'out_trade_no', required: true, type: 'String', example: '20160806151343349', desc: '商户系统内部的订单号' },
                    { key: '4', name: '支付方式', field: 'type', required: true, type: 'String', example: 'alipay', desc: '' },
                    { key: '5', name: '商品名称', field: 'name', required: true, type: 'String', example: 'VIP会员', desc: '' },
                    { key: '6', name: '商品金额', field: 'money', required: true, type: 'String', example: '1.00', desc: '' },
                    { key: '7', name: '支付状态', field: 'trade_status', required: true, type: 'String', example: 'TRADE_SUCCESS', desc: '只有TRADE_SUCCESS是成功' },
                    { key: '8', name: '业务扩展参数', field: 'param', required: false, type: 'String', example: '', desc: '' },
                    { key: '9', name: '签名字符串', field: 'sign', required: true, type: 'String', example: '202cb962ac59075b964b07152d234b70', desc: 'MD5签名' },
                    { key: '10', name: '签名类型', field: 'sign_type', required: true, type: 'String', example: 'MD5', desc: '默认为MD5' },
                  ]}
                  pagination={false}
                />

                <Alert 
                  message="重要提示" 
                  description="收到异步通知后，需返回 success 以表示服务器接收到了订单通知。"
                  type="info" 
                  showIcon 
                  style={{ marginTop: 16 }}
                />
              </section>

              {/* V1 MD5签名算法 */}
              <section id="v1-sign" className={styles.section}>
                <h2>MD5签名算法</h2>
                <ol>
                  <li>将发送或接收到的所有参数按照参数名ASCII码从小到大排序（a-z），sign、sign_type、和空值不参与签名！</li>
                  <li>将排序后的参数拼接成URL键值对的格式，例如 <code>a=b&c=d&e=f</code>，参数值不要进行url编码。</li>
                  <li>再将拼接好的字符串与商户密钥KEY进行MD5加密得出sign签名参数，<code>sign = md5 ( a=b&c=d&e=f + KEY )</code> （注意：+ 为各语言的拼接符，不是字符！），md5结果为小写。</li>
                  <li>具体签名与发起支付的示例代码可下载SDK查看。</li>
                </ol>
              </section>

              {/* V1 支付方式列表 */}
              <section id="v1-paytype" className={styles.section}>
                <h2>支付方式列表</h2>
                <Table
                  columns={[
                    { title: '调用值', dataIndex: 'code', key: 'code' },
                    { title: '描述', dataIndex: 'name', key: 'name' },
                  ]}
                  dataSource={[
                    { key: '1', code: 'alipay', name: '支付宝' },
                    { key: '2', code: 'wxpay', name: '微信支付' },
                    { key: '3', code: 'qqpay', name: 'QQ钱包' },
                    { key: '4', code: 'bank', name: '网银支付' },
                  ]}
                  pagination={false}
                />
              </section>

              {/* V1 设备类型列表 */}
              <section id="v1-device" className={styles.section}>
                <h2>设备类型列表</h2>
                <Table
                  columns={[
                    { title: '调用值', dataIndex: 'code', key: 'code' },
                    { title: '描述', dataIndex: 'name', key: 'name' },
                  ]}
                  dataSource={[
                    { key: '1', code: 'pc', name: '电脑浏览器' },
                    { key: '2', code: 'mobile', name: '手机浏览器' },
                    { key: '3', code: 'qq', name: '手机QQ内浏览器' },
                    { key: '4', code: 'wechat', name: '微信内浏览器' },
                    { key: '5', code: 'alipay', name: '支付宝客户端' },
                    { key: '6', code: 'jump', name: '仅返回支付跳转url' },
                  ]}
                  pagination={false}
                />
              </section>

              {/* V1 API接口 */}
              <section id="v1-api-order" className={styles.section}>
                <h2>[API]查询单个订单</h2>
                <Card size="small" title="基本信息" style={{ marginBottom: 16 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div><strong>接口地址：</strong><code className={styles.url}>/api.php?act=order&pid={'{商户ID}'}&key={'{商户密钥}'}&out_trade_no={'{商户订单号}'}</code></div>
                    <div><strong>请求方式：</strong><Tag color="green">GET</Tag></div>
                  </Space>
                </Card>
              </section>

              {/* V1 SDK下载 */}
              <section id="v1-sdk" className={styles.section}>
                <h2>SDK下载</h2>
                <Card>
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                      <h4><DownloadOutlined /> PHP SDK</h4>
                      <p>适用于 V1 接口的 PHP SDK</p>
                      <a href="/files/SDK.zip" target="_blank">
                        <Tag color="blue" style={{ cursor: 'pointer' }}>下载 SDK.zip</Tag>
                      </a>
                    </div>
                    <div>
                      <h4><DownloadOutlined /> Java SDK</h4>
                      <p>适用于 V1 接口的 Java SDK</p>
                      <a href="/files/SDK_JAVA.zip" target="_blank">
                        <Tag color="blue" style={{ cursor: 'pointer' }}>下载 SDK_JAVA.zip</Tag>
                      </a>
                    </div>
                  </Space>
                </Card>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ApiDoc

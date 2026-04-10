import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ConfigProvider 
    locale={zhCN}
    theme={{
      token: {
        colorPrimary: '#2563eb',
        borderRadius: 0,
      },
      components: {
        Button: { borderRadius: 0 },
        Input: { borderRadius: 0 },
        Select: { borderRadius: 0 },
        Card: { borderRadius: 0 },
        Modal: { borderRadius: 0 },
        Table: { borderRadius: 0 },
        Tag: { borderRadius: 0 },
        Menu: { borderRadius: 0 },
      }
    }}
  >
    <AntdApp>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </AntdApp>
  </ConfigProvider>
)

import axios from 'axios'

const api = axios.create({
  baseURL: '',
  timeout: 30000,
  withCredentials: true // 启用cookie
})

// 响应拦截器
api.interceptors.response.use(
  response => {
    if (response.data.code === -401) {
      window.location.href = '/login'
    }
    return response
  },
  error => {
    return Promise.reject(error)
  }
)

export default api

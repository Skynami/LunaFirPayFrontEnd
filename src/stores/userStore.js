import { create } from 'zustand'
import api from '../utils/api'

export const useUserStore = create((set, get) => ({
  user: null,
  isLoggedIn: false,
  isRam: false,          // 是否是 RAM 子账户
  ramInfo: null,         // RAM 用户信息（ownerType, ownerId, permissions等）
  userType: null,        // 用户类型：'merchant' 或 'admin'

  // 检查认证状态（使用cookie）
  checkAuth: async () => {
    try {
      const res = await api.get('/api/auth/verify')
      if (res.data.code === 0) {
        const data = res.data.data
        set({
          user: data,
          isLoggedIn: true,
          isRam: data.isRam || false,
          userType: data.isRam ? data.ownerType : data.userType,
          ramInfo: data.isRam ? {
            ownerType: data.ownerType,
            ownerId: data.ownerId,
            ownerName: data.ownerName,
            permissions: data.permissions,
            displayName: data.displayName
          } : null
        })
        return true
      }
    } catch (error) {
      console.error('验证失败:', error)
    }

    set({ user: null, isLoggedIn: false, isRam: false, ramInfo: null, userType: null })
    return false
  },

  // 登录（需要指定 userType）
  login: async (username, password, userType) => {
    const res = await api.post('/api/auth/login', { username, password, userType })
    if (res.data.code === 0) {
      const data = res.data.data
      set({
        user: data,
        isLoggedIn: true,
        isRam: data.isRam || false,
        userType: data.isRam ? data.ownerType : data.userType,
        ramInfo: data.isRam ? {
          ownerType: data.ownerType,
          ownerId: data.ownerId,
          permissions: data.permissions,
          displayName: data.displayName
        } : null
      })
      // 获取完整用户信息
      await get().checkAuth()
      return { success: true, isRam: data.isRam, ownerType: data.ownerType, userType: data.userType }
    }
    return { success: false, msg: res.data.msg }
  },

  // 注册（首个用户自动成为管理员）
  register: async (userData) => {
    const res = await api.post('/api/auth/register', userData)
    if (res.data.code === 0) {
      const data = res.data.data
      set({
        user: data,
        isLoggedIn: true,
        isRam: false,
        userType: data.userType || 'merchant',
        ramInfo: null
      })
      return { success: true, msg: res.data.msg, isAdmin: data.isAdmin, userType: data.userType }
    }
    return { success: false, msg: res.data.msg }
  },

  // 退出登录
  logout: async () => {
    try {
      await api.post('/api/auth/logout')
    } catch (e) {}
    set({
      user: null,
      isLoggedIn: false,
      isRam: false,
      userType: null,
      ramInfo: null
    })
  },

  // 检查RAM权限
  hasRamPermission: (permType) => {
    const { isRam, ramInfo } = get()
    if (!isRam || !ramInfo) return true  // 非RAM用户有全部权限
    const permissions = ramInfo.permissions || []
    return permissions.includes('admin') || permissions.includes(permType)
  },

  // 获取RAM用户可访问的平台类型
  getRamPlatform: () => {
    const { isRam, ramInfo } = get()
    if (!isRam || !ramInfo) return null
    return ramInfo.ownerType  // 'merchant' 或 'admin'
  }
}))

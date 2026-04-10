import { useState, useEffect } from 'react'

/**
 * 判断当前是否为移动端视图
 * @param {number} breakpoint - 断点宽度，默认768px
 * @returns {boolean} 是否为移动端
 */
export const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint)
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [breakpoint])
  
  return isMobile
}

/**
 * 获取当前视口尺寸类型
 * @returns {'xs' | 'sm' | 'md' | 'lg' | 'xl'} 视口尺寸类型
 */
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState(getBreakpoint())
  
  function getBreakpoint() {
    const width = window.innerWidth
    if (width < 576) return 'xs'
    if (width < 768) return 'sm'
    if (width < 992) return 'md'
    if (width < 1200) return 'lg'
    return 'xl'
  }
  
  useEffect(() => {
    const handleResize = () => {
      setBreakpoint(getBreakpoint())
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  return breakpoint
}

export default useIsMobile

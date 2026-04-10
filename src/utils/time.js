import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

// 格式化时间为东八区显示
export function formatTime(time, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!time) return '-'
  return dayjs(time).tz('Asia/Shanghai').format(format)
}

// 格式化日期
export function formatDate(time, format = 'YYYY-MM-DD') {
  if (!time) return '-'
  return dayjs(time).tz('Asia/Shanghai').format(format)
}

export default { formatTime, formatDate }

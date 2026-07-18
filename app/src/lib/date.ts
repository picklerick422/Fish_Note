import { differenceInCalendarDays, differenceInHours, format } from 'date-fns'

export const WEEKDAYS_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 列表用相对时间：刚刚 / N 小时前 / 昨天 HH:mm / N 天前 / M月d日 */
export function relTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const days = differenceInCalendarDays(now, date)
  if (days === 0) {
    const hours = differenceInHours(now, date)
    if (hours < 1) return '刚刚'
    return `${hours} 小时前`
  }
  if (days === 1) return `昨天 ${format(date, 'HH:mm')}`
  if (days < 7) return `${days} 天前`
  return format(date, 'M月d日')
}

/** 正文字数（去除 Markdown 标记与空白） */
export function wordCount(markdown: string): number {
  return markdown.replace(/[#>*`\-|[\]()~]/g, '').replace(/\s/g, '').length
}

/** 按时段问候语 */
export function greetingByHour(hour: number): string {
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  if (hour < 23) return '晚上好'
  return '夜深了'
}

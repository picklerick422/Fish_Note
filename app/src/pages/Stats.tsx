import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router'
import { usePageHeader } from '@/components/Layout'
import BigNumberCards from './stats/BigNumberCards'
import YearHeatmapCard from './stats/YearHeatmapCard'
import TrendChartCard from './stats/TrendChartCard'
import CategoryDonutCard from './stats/CategoryDonutCard'
import HourChartCard from './stats/HourChartCard'
import TopTagsCard from './stats/TopTagsCard'
import AchievementWall from './stats/AchievementWall'
import TimeRangeControl from './stats/TimeRangeControl'
import { resolveRange, type DateRange, type RangeKey } from './stats/range'

/**
 * 统计页（stats.md）：大数字总览 + 年度热力图 + 趋势/分布/习惯洞察 + 成就墙。
 * 时间范围作用于大数字卡与全部图表（年度热力图除外）。
 * URL 协议：/stats#heatmap 滚动定位到热力图。
 */
export default function Stats() {
  const location = useLocation()
  const [rangeKey, setRangeKey] = useState<RangeKey>('all')
  const [custom, setCustom] = useState<DateRange | null>(null)
  const range = useMemo(() => resolveRange(rangeKey, custom), [rangeKey, custom])

  usePageHeader(
    {
      title: '统计',
      subtitle: '每一条记录，都算数',
      actions: (
        <TimeRangeControl
          rangeKey={rangeKey}
          custom={custom}
          onChange={(key, nextCustom) => {
            setRangeKey(key)
            if (nextCustom) setCustom(nextCustom)
          }}
        />
      ),
    },
    [rangeKey, custom],
  )

  // /stats#heatmap → 滚动定位到年度热力图
  useEffect(() => {
    if (location.hash !== '#heatmap') return
    const t = setTimeout(() => {
      document.getElementById('heatmap')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
    return () => clearTimeout(t)
  }, [location.hash])

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* R1 大数字卡 ×4 */}
      <BigNumberCards rangeKey={rangeKey} range={range} baseDelay={0} />
      {/* R2 年度热力图（不受时间范围影响） */}
      <YearHeatmapCard baseDelay={0.1} />
      {/* R3 趋势 + 分类 */}
      <TrendChartCard range={range} baseDelay={0.2} />
      <CategoryDonutCard baseDelay={0.26} />
      {/* R4 时段 + 标签 */}
      <HourChartCard range={range} baseDelay={0.3} />
      <TopTagsCard range={range} baseDelay={0.36} />
      {/* R5 成就墙 */}
      <AchievementWall baseDelay={0.4} />
    </div>
  )
}

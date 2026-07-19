/**
 * 种子示例数据 —— 仅在 localStorage 无数据时注入一次。
 * 所有日期基于「首次运行当天」动态生成，保证首页/热力图/摘要始终有真实感。
 */
import { format, subDays, subMonths, startOfMonth, getISOWeek } from 'date-fns'
import type { Achievement, ChatMessage, Note, Notebook, Report } from '@/types'

/** 确定性伪随机（mulberry32），保证每次首装生成的热力图一致 */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const now = () => new Date()

function isoDaysAgo(days: number, hour = 10, minute = 0): string {
  const d = subDays(now(), days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function dayKey(days: number): string {
  return format(subDays(now(), days), 'yyyy-MM-dd')
}

export const seedNotebooks = (): Notebook[] => [
  { id: 'nb-daily', name: '日记', icon: 'CalendarCheck', count: 5 },
  { id: 'nb-work', name: '工作与项目', icon: 'Briefcase', count: 5 },
  { id: 'nb-study', name: '学习笔记', icon: 'BookOpen', count: 4 },
  { id: 'nb-life', name: '生活碎片', icon: 'Coffee', count: 4 },
]

function dayTitle(days: number, label: string) {
  const dates: Record<number, string> = { 0: '今日', 1: '昨日' }
  const prefix = dates[days] ?? `${days}天前`
  return `${prefix}${label}`
}

export const seedNotes = (): Note[] => {
  const d0 = format(now(), 'M月d日')
  const d1 = format(subDays(now(), 1), 'M月d日')
  const d5 = format(subDays(now(), 5), 'M月d日')
  const d8 = format(subDays(now(), 8), 'M月d日')
  const d15 = format(subDays(now(), 15), 'M月d日')
  const lastMonth = format(subMonths(now(), 1), 'M月')
  const week = getISOWeek(now())

  const base = {
    color: undefined,
    pinned: false,
    deletedAt: null,
  }

  return [
    {
      ...base,
      id: 'n-001',
      title: dayTitle(0, '小结'),
      notebookId: 'nb-daily',
      kind: 'daily',
      tags: ['工作', '记录'],
      aiGenerated: true,
      createdAt: isoDaysAgo(0, 9, 12),
      updatedAt: isoDaysAgo(0, Math.max(0, now().getHours() - 3) || 9, 5),
      contentMarkdown: `## ${d0} · 今日小结 #87

### ✅ 完成事项
- 完成订单模块接口联调
- 修复 2 个分页相关 Bug
- 更新订单模块接口文档
- 清理 3 条历史告警日志

### ⚠️ 问题记录
- 优惠券接口文档待前端确认

### 📌 明日计划
- 与前端联调优惠券接口
- 向张老师索要测试账号
- 准备周五周会汇报材料

#工作 #后端 #联调`,
    },
    {
      ...base,
      id: 'n-002',
      title: 'useSyncExternalStore 踩坑笔记',
      notebookId: 'nb-study',
      kind: 'memo',
      tags: ['React', '前端'],
      aiGenerated: false,
      createdAt: isoDaysAgo(1, 22, 14),
      updatedAt: isoDaysAgo(1, 22, 14),
      contentMarkdown: `# useSyncExternalStore 踩坑笔记

今天在 SSR 场景下用 \`useSyncExternalStore\` 订阅 zustand，水合时报了 **getSnapshot should be cached** 警告。

## 原因
\`getSnapshot\` 每次返回新对象引用，React 认为 store 在渲染期间不断变化，触发无限重渲染。

## 正确写法
\`\`\`ts
const value = useSyncExternalStore(
  store.subscribe,
  () => store.getState().value, // 必须返回稳定引用
  () => INITIAL_VALUE,           // 服务端快照，避免水合不一致
)
\`\`\`

> 结论：选择器返回对象时用 \`useShallow\`，SSR 必须传第三个参数。

#React #前端`,
    },
    {
      ...base,
      id: 'n-003',
      title: dayTitle(1, '小结'),
      notebookId: 'nb-daily',
      kind: 'daily',
      tags: ['工作', '记录'],
      aiGenerated: true,
      createdAt: isoDaysAgo(1, 19, 2),
      updatedAt: isoDaysAgo(1, 19, 2),
      contentMarkdown: `## ${d1} · 今日小结 #86

### ✅ 完成事项
- 封装订单列表分页组件
- 联调登录态静默刷新逻辑
- Code Review 通过，合入 develop

### ⚠️ 问题记录
- 测试环境偶发 502，明天继续排查网关日志

### 📌 明日计划
- 订单模块接口联调收尾
- 补充分页组件单测

#工作 #后端`,
    },
    {
      ...base,
      id: 'n-004',
      title: `第 ${week} 周周报（草稿）`,
      notebookId: 'nb-work',
      kind: 'weekly',
      tags: ['周报', '工作'],
      aiGenerated: true,
      createdAt: isoDaysAgo(2, 18, 40),
      updatedAt: isoDaysAgo(2, 18, 40),
      contentMarkdown: `## 第 ${week} 周周报（草稿）

### 本周完成
- 订单模块开发完成度 80%，接口联调过半
- 修复分页相关 Bug 4 个
- 完成登录态刷新改造

### 数据
- 提交 23 次，Review 他人 MR 5 个

### 下周计划
- 优惠券接口联调
- 订单模块提测

#周报 #工作`,
    },
    {
      ...base,
      id: 'n-005',
      title: '书单：想读的三本技术书',
      notebookId: 'nb-life',
      kind: 'memo',
      tags: ['书单'],
      aiGenerated: false,
      createdAt: isoDaysAgo(3, 21, 30),
      updatedAt: isoDaysAgo(3, 21, 30),
      contentMarkdown: `# 书单：想读的三本技术书

1. **《重构：改善既有代码的设计》** —— 第二章的「坏味道」清单想抄到工位上
2. **《凤凰项目》** —— 听说用小说讲 DevOps，适合通勤读
3. **《深入理解计算机系统》** —— 第三章机器级表示，配合 CSAPP 课程

> 618 先加购物车，读完一本才能买下一本。

#书单`,
    },
    {
      ...base,
      id: 'n-006',
      title: '优惠券接口字段备忘',
      notebookId: 'nb-work',
      kind: 'memo',
      tags: ['工作', '接口'],
      aiGenerated: false,
      createdAt: isoDaysAgo(4, 15, 20),
      updatedAt: isoDaysAgo(4, 15, 20),
      contentMarkdown: `# 优惠券接口字段备忘

| 字段 | 类型 | 说明 |
|---|---|---|
| couponId | string | 券模板 ID |
| threshold | number | 使用门槛（分） |
| validDays | number | 领取后有效天数 |

- 发放接口幂等键：\`userId + couponId + bizDate\`
- 待前端确认：叠券规则的展示文案

#工作 #接口`,
    },
    {
      ...base,
      id: 'n-007',
      title: dayTitle(5, '小结'),
      notebookId: 'nb-daily',
      kind: 'daily',
      tags: ['工作'],
      aiGenerated: true,
      createdAt: isoDaysAgo(5, 18, 55),
      updatedAt: isoDaysAgo(5, 18, 55),
      contentMarkdown: `## ${d5} · 今日小结 #85

### ✅ 完成事项
- 订单状态机梳理并输出时序图
- 修复金额计算精度问题（改用分存储）

### ⚠️ 问题记录
- 无阻塞

### 📌 明日计划
- 分页组件封装

#工作`,
    },
    {
      ...base,
      id: 'n-008',
      title: 'Rust ownership 读书笔记',
      notebookId: 'nb-study',
      kind: 'memo',
      tags: ['Rust', '读书'],
      aiGenerated: false,
      createdAt: isoDaysAgo(6, 22, 5),
      updatedAt: isoDaysAgo(6, 22, 5),
      contentMarkdown: `# Rust ownership 读书笔记

三条规则：

1. 每个值都有一个所有者
2. 同一时刻只能有一个所有者
3. 所有者离开作用域，值被丢弃

借用检查器在编译期保证 **不存在悬垂引用**。今天理解了 \`&mut\` 的排他性：可变借用期间不允许任何其他借用存在。

> 「所有权让内存安全成为编译期的承诺，而不是运行时的祈祷。」

#Rust #读书`,
    },
    {
      ...base,
      id: 'n-009',
      title: '健身计划调整',
      notebookId: 'nb-life',
      kind: 'memo',
      tags: ['健身'],
      aiGenerated: false,
      createdAt: isoDaysAgo(7, 20, 0),
      updatedAt: isoDaysAgo(7, 20, 0),
      contentMarkdown: `# 健身计划调整

- 周一 / 周四：力量（胸背超级组）
- 周二 / 周五：跑步 5km，配速目标 5'40"
- 周三：休息 + 拉伸

加班日保底：回家做 3 组平板支撑，不断更。

#健身`,
    },
    {
      ...base,
      id: 'n-010',
      title: dayTitle(8, '小结'),
      notebookId: 'nb-daily',
      kind: 'daily',
      tags: ['工作'],
      aiGenerated: true,
      createdAt: isoDaysAgo(8, 19, 10),
      updatedAt: isoDaysAgo(8, 19, 10),
      contentMarkdown: `## ${d8} · 今日小结 #84

### ✅ 完成事项
- 完成订单创建接口开发
- 编写接口文档初稿

### ⚠️ 问题记录
- 库存扣减的并发方案待定，约了导师周三讨论

### 📌 明日计划
- 订单状态机梳理

#工作`,
    },
    {
      ...base,
      id: 'n-011',
      title: '站会发言技巧总结',
      notebookId: 'nb-work',
      kind: 'memo',
      tags: ['沟通', '成长'],
      aiGenerated: false,
      createdAt: isoDaysAgo(9, 12, 30),
      updatedAt: isoDaysAgo(9, 12, 30),
      contentMarkdown: `# 站会发言技巧总结

公式：**昨天做了什么 → 今天要做什么 → 有什么阻塞**

- 控制在 60 秒内，细节会后再聊
- 阻塞事项一定要说出口，别自己硬扛
- 今天发言终于不紧张了，值得记一笔 🎉

#沟通 #成长`,
    },
    {
      ...base,
      id: 'n-012',
      title: 'Vite 插件开发入门',
      notebookId: 'nb-study',
      kind: 'memo',
      tags: ['Vite', '前端'],
      aiGenerated: false,
      createdAt: isoDaysAgo(10, 21, 45),
      updatedAt: isoDaysAgo(10, 21, 45),
      contentMarkdown: `# Vite 插件开发入门

一个最小插件：

\`\`\`ts
export default function myPlugin(): Plugin {
  return {
    name: 'my-plugin',
    transform(code, id) {
      if (id.endsWith('.md')) {
        return { code: mdToJs(code), map: null }
      }
    },
  }
}
\`\`\`

关键钩子执行顺序：\`config → resolveId → load → transform → buildEnd\`。

#Vite #前端`,
    },
    {
      ...base,
      id: 'n-013',
      title: `${lastMonth}复盘（草稿）`,
      notebookId: 'nb-work',
      kind: 'monthly',
      tags: ['复盘', '月报'],
      aiGenerated: true,
      createdAt: isoDaysAgo(12, 20, 0),
      updatedAt: isoDaysAgo(12, 20, 0),
      contentMarkdown: `## ${lastMonth}复盘（草稿）

### 亮点
- 独立承接订单模块，从设计到联调全流程
- 坚持了 26 天记录，形成日报习惯

### 不足
- 单测覆盖率偏低（38%）
- 有 3 天加班到 23 点后没有复盘

### 下月目标
- 单测覆盖率提升到 60%
- 读完《重构》前八章

#复盘 #月报`,
    },
    {
      ...base,
      id: 'n-014',
      title: '周末爬山路线规划',
      notebookId: 'nb-life',
      kind: 'memo',
      tags: ['户外'],
      aiGenerated: false,
      createdAt: isoDaysAgo(13, 16, 20),
      updatedAt: isoDaysAgo(13, 16, 20),
      contentMarkdown: `# 周末爬山路线规划

- 集合：8:00 地铁 3 号线终点站
- 路线：北门上 → 观景台 → 南门下，全程约 9km
- 装备：登山杖、2L 水、防晒、能量胶

下山后去吃那家泉水鸡，谁迟到谁买单。

#户外`,
    },
    {
      ...base,
      id: 'n-015',
      title: '代码评审 Checklist',
      notebookId: 'nb-work',
      kind: 'memo',
      tags: ['工程', '效率'],
      aiGenerated: false,
      createdAt: isoDaysAgo(14, 11, 0),
      updatedAt: isoDaysAgo(14, 11, 0),
      contentMarkdown: `# 代码评审 Checklist

- [ ] 命名是否表意，函数是否单一职责
- [ ] 边界条件：空数组 / null / 并发
- [ ] 错误处理路径是否完整
- [ ] 日志是否脱敏
- [ ] 单测是否覆盖主流程

> Review 时先读测试，再读实现，速度快一倍。

#工程 #效率`,
    },
    {
      ...base,
      id: 'n-016',
      title: dayTitle(15, '小结'),
      notebookId: 'nb-daily',
      kind: 'daily',
      tags: ['工作'],
      aiGenerated: true,
      createdAt: isoDaysAgo(15, 19, 30),
      updatedAt: isoDaysAgo(15, 19, 30),
      contentMarkdown: `## ${d15} · 今日小结 #83

### ✅ 完成事项
- 需求评审：订单模块排期确认
- 搭建模块骨架与领域模型

### ⚠️ 问题记录
- 优惠券规则细节产品还没给结论

### 📌 明日计划
- 订单创建接口开发

#工作`,
    },
    {
      ...base,
      id: 'n-017',
      title: 'TypeScript 体操笔记',
      notebookId: 'nb-study',
      kind: 'memo',
      tags: ['TypeScript'],
      aiGenerated: false,
      createdAt: isoDaysAgo(16, 22, 40),
      updatedAt: isoDaysAgo(16, 22, 40),
      contentMarkdown: `# TypeScript 体操笔记

今天拿下 \`Tuple to Union\`：

\`\`\`ts
type TupleToUnion<T extends readonly unknown[]> = T[number]
\`\`\`

关键点：数组类型用 \`T[number]\` 索引会得到元素联合类型。配合 \`as const\` 使用风味更佳。

#TypeScript`,
    },
    {
      ...base,
      id: 'n-018',
      title: '咖啡店清单：城北三家',
      notebookId: 'nb-life',
      kind: 'memo',
      tags: ['生活'],
      aiGenerated: false,
      createdAt: isoDaysAgo(18, 14, 15),
      updatedAt: isoDaysAgo(18, 14, 15),
      contentMarkdown: `# 咖啡店清单：城北三家

1. **山丘咖啡** —— 手冲耶加雪菲，插座多，适合写代码
2. **白噪** —— 深烘拿铁一绝，人多嘈杂，适合阅读
3. **渡口** —— 靠窗位能看到江，周末要早去

#生活`,
    },
  ]
}

/** 热力图活动数据：yyyy-MM-dd -> 条数。保证最近 28 天连续有记录（呼应连续天数）。 */
export const seedActivity = (): Record<string, number> => {
  const rand = mulberry32(20240520)
  const activity: Record<string, number> = {}
  for (let i = 400; i >= 0; i--) {
    const r = rand()
    let count = 0
    if (r >= 0.26) {
      count = 1 + Math.floor(rand() * 4)
      if (rand() < 0.06) count += 2 + Math.floor(rand() * 2)
    }
    if (i <= 27 && count === 0) count = 1 + Math.floor(rand() * 2) // 连续 28 天
    activity[dayKey(i)] = count
  }
  activity[dayKey(0)] = 3 // 今天
  activity[dayKey(28)] = 0 // 让「当前连续」恰好停在 28 天
  // 制造「最长纪录 45 天」：第 60~104 天全部有记录，两端截断
  for (let i = 60; i <= 104; i++) {
    if ((activity[dayKey(i)] ?? 0) === 0) activity[dayKey(i)] = 1
  }
  activity[dayKey(59)] = 0
  activity[dayKey(105)] = 0
  // 制造一个「最活跃日」（约两个月前）
  activity[dayKey(66)] = 8
  return activity
}

export const seedReports = (): Report[] => {
  const week = getISOWeek(now())
  const monthLabel = format(now(), 'M月')
  return [
    {
      id: 'r-001',
      type: 'daily',
      title: dayTitle(0, '小结'),
      contentMarkdown: `> 由小鱼根据今日 3 条随手记自动整理生成 ✦

### ✅ 完成事项
- 完成订单模块接口联调
- 修复 2 个分页相关 Bug
- 更新订单模块接口文档
- 清理 3 条历史告警日志

### ⚠️ 问题记录
- 优惠券接口文档待前端确认

### 📌 明日计划
- 与前端联调优惠券接口
- 向张老师索要测试账号
- 准备周五周会汇报材料`,
      dateRange: { start: dayKey(0), end: dayKey(0) },
      createdAt: isoDaysAgo(0, 18, 30),
      sources: ['n-001'],
    },
    {
      id: 'r-002',
      type: 'weekly',
      title: `第 ${week} 周周报`,
      contentMarkdown: `> 覆盖本周 5 篇日报 · 由小鱼汇总生成 ✦

### 本周完成
- 订单模块开发完成度 80%，接口联调过半
- 修复分页相关 Bug 4 个
- 完成登录态静默刷新改造

### 关键数据
- 工作 5 天 · 完成 17 件事项 · 记录 5 篇日报

### 下周计划
- 优惠券接口联调
- 订单模块提测`,
      dateRange: { start: dayKey(6), end: dayKey(0) },
      createdAt: isoDaysAgo(2, 18, 45),
      sources: ['n-001', 'n-003', 'n-007'],
    },
    {
      id: 'r-003',
      type: 'monthly',
      title: `${monthLabel}月报`,
      contentMarkdown: `> 覆盖本月 18 篇记录 · 由小鱼汇总生成 ✦

### 本月概览
- 记录 18 天 · 完成 52 件事项 · 输出 4 篇周报素材
- 主线：订单模块从 0 到联调

### 成长点
- 第一次独立负责模块排期与评审
- 站会发言从磕巴到 60 秒讲清三件事

### 待改进
- 单测覆盖率仍偏低，下月设硬性指标`,
      dateRange: { start: format(startOfMonth(now()), 'yyyy-MM-dd'), end: dayKey(0) },
      createdAt: isoDaysAgo(4, 20, 10),
      sources: ['n-001', 'n-004', 'n-013'],
    },
  ]
}

export const seedChatMessages = (): ChatMessage[] => []

export const seedAchievements = (): Achievement[] => [
  { id: 'first-note', title: '初心萌芽', description: '写下第一条便签', icon: 'Sprout', unlockedAt: isoDaysAgo(120, 9, 0) },
  { id: 'streak-7', title: '七日之约', description: '连续记录 7 天', icon: 'Flame', unlockedAt: isoDaysAgo(100, 21, 0) },
  { id: 'notes-100', title: '便签破百', description: '累计 100 条便签', icon: 'NotebookPen', unlockedAt: isoDaysAgo(40, 18, 0) },
  { id: 'first-report', title: '首份日报', description: '生成第一篇 AI 日报', icon: 'FileBarChart2', unlockedAt: isoDaysAgo(90, 19, 0) },
  { id: 'streak-30', title: '月度坚持', description: '连续记录 30 天', icon: 'Trophy', unlockedAt: null },
  { id: 'notes-500', title: '半山回望', description: '累计 500 条便签', icon: 'Mountain', unlockedAt: null },
  { id: 'ai-100', title: 'AI 拍档', description: '完成 100 次 AI 整理', icon: 'Sparkles', unlockedAt: null },
]

/** 灵感收益 sparkline：近 14 天（最后 7 天合计 120，呼应「+120 本周」） */
export const seedInspirationSeries = (): number[] =>
  [95, 140, 80, 160, 130, 110, 155, 20, 10, 25, 15, 30, 5, 15]

/** 大数字计数器基线：实际种子便签 18 条，基线补齐到设计示例量级 */
export const SEED_COUNTER_BASE = {
  notes: 228, // +18 实际 = 246
  daily: 82, // +5 实际 = 87
  weekly: 11, // +1 实际 = 12
  monthly: 2, // +1 实际 = 3
}

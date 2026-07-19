/**
 * 数据版本迁移：版本不符时清空全部 sg-* 数据（含旧示例内容），由新 seed 重新注入。
 * 必须是 main.tsx 的第一个 import——ES 模块按 import 顺序求值，
 * 保证本模块在任何 store（zustand persist 水合）之前执行。
 */
const DATA_VERSION = '2'
try {
  if (localStorage.getItem('sg-data-version') !== DATA_VERSION) {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sg-')) localStorage.removeItem(key)
    }
    localStorage.setItem('sg-data-version', DATA_VERSION)
  }
} catch {
  /* ignore */
}

export {}

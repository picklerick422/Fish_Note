/** 大数字压缩：≥10000 → 182.4K */
export function compact(n: number): { value: number; suffix: string; decimals: number } {
  if (Math.abs(n) >= 10000) return { value: n / 1000, suffix: 'K', decimals: 1 }
  return { value: n, suffix: '', decimals: 0 }
}

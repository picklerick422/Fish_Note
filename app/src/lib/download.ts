/**
 * 统一下载出口：鸿蒙壳内走 fishNoteShell 桥，浏览器走 <a download>。
 * 壳侧桥由 harmony/entry/src/main/ets/pages/Index.ets 通过 javaScriptProxy 注入。
 */
import { notify } from '@/lib/toast'

/** 鸿蒙壳注入的原生桥（见 harmony/entry/src/main/ets/pages/Index.ets） */
interface FishNoteShell {
  saveFile: (filename: string, base64: string) => void
}

declare global {
  interface Window {
    fishNoteShell?: FishNoteShell
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1)) // 去掉 data:*;base64, 前缀
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function downloadBlob(filename: string, blob: Blob) {
  // 鸿蒙 ArkWeb 壳内 <a download> 不可用，走原生桥保存
  if (window.fishNoteShell?.saveFile) {
    try {
      window.fishNoteShell.saveFile(filename, await blobToBase64(blob))
    } catch {
      notify.error('保存文件失败')
    }
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

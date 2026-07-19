/**
 * 鱼记 ArkWeb 壳：
 * - 通过 setPathAllowingUniversalAccess + file:// 协议加载 resfile 内置 Web 产物
 *   （resource://rawfile 协议有 CORS 限制，子资源 JS/CSS 会被拦截，故改用 resfile）
 * - javaScriptProxy 注入 window.fishNoteShell.saveFile（导出备份）
 * - onShowFileSelector 接管 <input type="file">（导入备份，过滤 .json）
 */
import { webview } from '@kit.ArkWeb'
import { fileIo as fs, picker } from '@kit.CoreFileKit'
import { util } from '@kit.ArkTS'
import { BusinessError } from '@kit.BasicServicesKit'
import { hilog } from '@kit.PerformanceAnalysisKit'
import { common } from '@kit.AbilityKit'

const DOMAIN = 0x0000
const TAG = 'FishNoteShell'

/** 保存 base64 内容到用户选择的位置（DocumentViewPicker.save） */
async function saveToUserFile(context: common.Context, filename: string, base64: string): Promise<void> {
  try {
    // 先解码：非法 base64 直接失败，不拉起保存框、不残留空文件
    const data = new util.Base64Helper().decodeSync(base64)
    const saverPicker = new picker.DocumentViewPicker(context)
    const opt = new picker.DocumentSaveOptions()
    opt.newFileNames = [filename]
    const uris = await saverPicker.save(opt)
    if (!uris || uris.length === 0) {
      return // 用户取消
    }
    const file = fs.openSync(uris[0], fs.OpenMode.READ_WRITE | fs.OpenMode.CREATE | fs.OpenMode.TRUNC)
    try {
      fs.writeSync(file.fd, data.buffer)
    } finally {
      fs.closeSync(file)
    }
    hilog.info(DOMAIN, TAG, 'saved %{public}s, %{public}d bytes', filename, data.length)
  } catch (e) {
    const err = e as BusinessError
    hilog.error(DOMAIN, TAG, 'saveFile failed: %{public}d %{public}s', err.code, err.message)
  }
}

/** 壳侧持有的 UIAbility 上下文（javaScriptProxy 注册对象禁止声明属性，故置于模块级） */
let shellContext: common.Context | undefined = undefined

/** 注入到网页 window.fishNoteShell 的原生桥（只声明方法，不声明属性） */
class FishNoteShell {
  saveFile(filename: string, base64: string): void {
    // 同步方法内发起异步保存，避免阻塞 Web 渲染
    if (shellContext) {
      saveToUserFile(shellContext, filename, base64)
    } else {
      hilog.error(DOMAIN, TAG, 'saveFile: shellContext not ready')
    }
  }
}

@Entry
@Component
struct Index {
  controller: webview.WebviewController = new webview.WebviewController()
  private shell: FishNoteShell = new FishNoteShell()

  aboutToAppear(): void {
    // getContext(this) 自 API 18 废弃，改用 UIContext.getHostContext
    shellContext = this.getUIContext().getHostContext()
  }

  /** 接管网页文件选择：拉起系统文档选择器，过滤 .json 备份 */
  private async pickFile(event: OnShowFileSelectorEvent): Promise<void> {
    try {
      if (!shellContext) {
        event.result.handleFileList([])
        return
      }
      const viewPicker = new picker.DocumentViewPicker(shellContext)
      const opt = new picker.DocumentSelectOptions()
      opt.maxSelectNumber = 1
      opt.fileSuffixFilters = ['备份 JSON|.json']
      const uris = await viewPicker.select(opt)
      event.result.handleFileList(uris ?? [])
    } catch (e) {
      const err = e as BusinessError
      hilog.error(DOMAIN, TAG, 'pickFile failed: %{public}d %{public}s', err.code, err.message)
      event.result.handleFileList([])
    }
  }

  build() {
    Column() {
      // src 设为空串，由 onControllerAttached 中 loadUrl 加载
      // 原因：resource://rawfile 协议的 origin 为 null，ArkWeb CORS 策略会拦截子资源
      // （JS/CSS），导致白屏。改用 resfile + file:// + setPathAllowingUniversalAccess
      // 避免 CORS 限制。
      Web({ src: '', controller: this.controller })
        .onControllerAttached(() => {
          try {
            const ctx = this.getUIContext().getHostContext()
            if (ctx) {
              // 设置路径白名单，允许 file:// 协议跨域访问 resfile 目录下的资源
              this.controller.setPathAllowingUniversalAccess([ctx.resourceDir])
              // 加载 resfile/webapp/index.html（由 scripts/sync-webapp.sh 同步）
              this.controller.loadUrl('file://' + ctx.resourceDir + '/webapp/index.html')
              hilog.info(DOMAIN, TAG, 'loading webapp from resfile: %{public}s/webapp/index.html', ctx.resourceDir)
            }
          } catch (e) {
            const err = e as BusinessError
            hilog.error(DOMAIN, TAG, 'onControllerAttached failed: %{public}d %{public}s', err.code, err.message)
          }
        })
        .fileAccess(true) // file:// 协议需要，且 setPathAllowingUniversalAccess 依赖于它
        .domStorageAccess(true) // localStorage 持久化（默认 false，必须开启）
        .darkMode(WebDarkMode.Auto) // prefers-color-scheme 跟随系统深浅色
        .javaScriptAccess(true)
        .zoomAccess(false) // 桌面应用禁用手势缩放
        // 单常驻页面、Web 组件与进程同生命周期，故豁免 deleteJavaScriptRegister 反注册
        .javaScriptProxy({
          object: this.shell,
          name: 'fishNoteShell',
          methodList: ['saveFile'],
          controller: this.controller,
        })
        .onShowFileSelector((event) => {
          if (!event) {
            return false // 无事件对象时交还系统默认处理，避免 input 挂起
          }
          this.pickFile(event)
          return true // 返回 true 表示应用接管文件选择
        })
        .onErrorReceive((event) => {
          if (event) {
            hilog.error(DOMAIN, TAG, 'load error: %{public}d %{public}s',
              event.error.getErrorCode(), event.error.getErrorInfo())
          }
        })
        .width('100%')
        .height('100%')
    }
    .width('100%')
    .height('100%')
  }
}

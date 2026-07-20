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
import { window } from '@kit.ArkUI'

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

  /** Web 端标题区域 pointerdown 时调用，触发系统级窗口拖拽 */
  startMoving(): void {
    try {
      const w = AppStorage.get<window.Window>('mainWindow')
      if (w) {
        w.startMoving().catch(() => {
          // 非自由窗口模式下失败，静默处理
        })
      }
    } catch (_) {
      // AppStorage 未就绪时忽略
    }
  }

  /** Web 端主题切换时调用，同步系统状态栏/导航栏图标颜色 */
  setDarkMode(isDark: boolean): void {
    try {
      const w = AppStorage.get<window.Window>('mainWindow')
      if (w) {
        const color = isDark ? '#FFFFFF' : '#000000'
        w.setWindowSystemBarProperties({
          statusBarContentColor: color,
          navigationBarContentColor: color,
        })
      }
    } catch (_) {
      // 静默处理
    }
  }
}

@Entry
@Component
struct Index {
  controller: webview.WebviewController = new webview.WebviewController()
  private shell: FishNoteShell = new FishNoteShell()
  @StorageProp('titleButtonRect') btnRect: window.TitleButtonRect | undefined = undefined
  @State buttonWidth: number = 138 // 默认三键宽度，由 onPageEnd 注入 Web 端

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
    Stack() {
      // ===== 底层：WebView 全屏填充 =====
      Web({ src: '', controller: this.controller })
        .onControllerAttached(() => {
          try {
            const ctx = this.getUIContext().getHostContext()
            if (ctx) {
              this.controller.setPathAllowingUniversalAccess([ctx.resourceDir])
              this.controller.loadUrl('file://' + ctx.resourceDir + '/webapp/index.html')
              hilog.info(DOMAIN, TAG, 'loading webapp from resfile: %{public}s/webapp/index.html', ctx.resourceDir)
            }
          } catch (e) {
            const err = e as BusinessError
            hilog.error(DOMAIN, TAG, 'onControllerAttached failed: %{public}d %{public}s', err.code, err.message)
          }
        })
        .fileAccess(true)
        .domStorageAccess(true)
        .darkMode(WebDarkMode.Auto)
        .javaScriptAccess(true)
        .zoomAccess(false)
        .javaScriptProxy({
          object: this.shell,
          name: 'fishNoteShell',
          methodList: ['saveFile', 'startMoving', 'setDarkMode'],
          controller: this.controller,
        })
        .onShowFileSelector((event) => {
          if (!event) {
            return false
          }
          this.pickFile(event)
          return true
        })
        .onErrorReceive((event) => {
          if (event) {
            hilog.error(DOMAIN, TAG, 'load error: %{public}d %{public}s',
              event.error.getErrorCode(), event.error.getErrorInfo())
          }
        })
        .onPageEnd(() => {
          // 注入 CSS 变量供 Web 端自适应避让（三键宽度/高度 + 紧贴边距）
          const btnW = (this.btnRect?.width ?? 138) + 12
          const btnH = (this.btnRect?.height ?? 40) + 4
          this.buttonWidth = btnW
          try {
            this.controller.runJavaScript(
              `(function(){var s=document.documentElement.style;s.setProperty('--system-btn-width','${btnW}px');s.setProperty('--system-btn-height','${btnH}px');s.setProperty('--shell-drag-height','12px');})()`
            )
          } catch (_) { /* ignore */ }
        })
        .width('100%')
        .height('100%')

      // ===== 顶层：窄条拖拽回落层（12vp，仅覆盖标题栏极顶部，Web 端标题区域由 JS bridge 精准处理） =====
      Row() {
        // 左 35%：拖拽手柄——不可见，对应各页面标题文字区域顶部
        Blank()
          .layoutWeight(35)
          .onTouch((event: TouchEvent) => {
            if (event.type === TouchType.Down) {
              const w = AppStorage.get<window.Window>('mainWindow')
              if (w) {
                w.startMoving().catch(() => {
                  // 非自由窗口模式下失败，静默处理
                })
              }
            }
          })
        // 右 65%：系统三键 + 页面操作区，事件穿透到 WebView
        Blank()
          .layoutWeight(65)
          .hitTestBehavior(HitTestMode.None)
      }
      .width('100%')
      .height(12)
    }
    .alignContent(Alignment.Top) // 拖拽 Row 对齐到顶部，WebView 填满
    .width('100%')
    .height('100%')
    .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP, SafeAreaEdge.BOTTOM])
  }
}

/**
 * 拾光便签 ArkWeb 壳：
 * - 加载 rawfile 内置 Web 产物（resource://rawfile/webapp/）
 * - javaScriptProxy 注入 window.fishNoteShell.saveFile（导出备份）
 * - onShowFileSelector 接管 <input type="file">（导入备份，过滤 .json）
 */
import { webview } from '@kit.ArkWeb'
import { fileIo as fs, picker } from '@kit.CoreFileKit'
import { util } from '@kit.ArkTS'
import { BusinessError } from '@kit.BasicServicesKit'
import { hilog } from '@kit.PerformanceAnalysisKit'
import { common } from '@kit.AbilityKit'

const TAG = 'FishNoteShell'

/** 保存 base64 内容到用户选择的位置（DocumentSaverPicker） */
async function saveToUserFile(context: common.Context, filename: string, base64: string): Promise<void> {
  try {
    const saverPicker = new picker.DocumentSaverPicker(context)
    const opt = new picker.DocumentSaveOptions()
    opt.newFileNames = [filename]
    const uris = await saverPicker.save(opt)
    if (!uris || uris.length === 0) {
      return // 用户取消
    }
    const data = new util.Base64Helper().decodeSync(base64)
    const file = fs.openSync(uris[0], fs.OpenMode.READ_WRITE | fs.OpenMode.CREATE | fs.OpenMode.TRUNC)
    fs.writeSync(file.fd, data.buffer)
    fs.closeSync(file)
    hilog.info(0x0000, TAG, `saved ${filename}, ${data.length} bytes`)
  } catch (e) {
    const err = e as BusinessError
    hilog.error(0x0000, TAG, `saveFile failed: ${err.code} ${err.message}`)
  }
}

/** 注入到网页 window.fishNoteShell 的原生桥（只声明方法，不声明属性） */
class FishNoteShell {
  private context: common.Context

  constructor(context: common.Context) {
    this.context = context
  }

  saveFile(filename: string, base64: string): void {
    // 同步方法内发起异步保存，避免阻塞 Web 渲染
    saveToUserFile(this.context, filename, base64)
  }
}

@Entry
@Component
struct Index {
  controller: webview.WebviewController = new webview.WebviewController()
  private shell: FishNoteShell = new FishNoteShell(getContext(this))

  /** 接管网页文件选择：拉起系统文档选择器，过滤 .json 备份 */
  private async pickFile(event: OnShowFileSelectorEvent): Promise<void> {
    try {
      const viewPicker = new picker.DocumentViewPicker(getContext(this))
      const opt = new picker.DocumentSelectOptions()
      opt.maxSelectNumber = 1
      opt.fileSuffixFilters = ['备份 JSON|.json']
      const uris = await viewPicker.select(opt)
      event.result.handleFileList(uris ?? [])
    } catch (e) {
      const err = e as BusinessError
      hilog.error(0x0000, TAG, `pickFile failed: ${err.code} ${err.message}`)
      event.result.handleFileList([])
    }
  }

  build() {
    Column() {
      Web({ src: 'resource://rawfile/webapp/index.html', controller: this.controller })
        .domStorageAccess(true) // localStorage 持久化（默认 false，必须开启）
        .javaScriptAccess(true)
        .zoomAccess(false) // 桌面应用禁用手势缩放
        .javaScriptProxy({
          object: this.shell,
          name: 'fishNoteShell',
          methodList: ['saveFile'],
          controller: this.controller,
        })
        .onShowFileSelector((event) => {
          if (event) {
            this.pickFile(event)
          }
          return true // 返回 true 表示应用接管文件选择
        })
        .onErrorReceive((event) => {
          if (event) {
            hilog.error(0x0000, TAG,
              `load error: ${event.error.getErrorCode()} ${event.error.getErrorInfo()}`)
          }
        })
        .width('100%')
        .height('100%')
    }
    .width('100%')
    .height('100%')
  }
}

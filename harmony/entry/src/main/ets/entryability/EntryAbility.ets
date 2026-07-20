import { AbilityConstant, ConfigurationConstant, UIAbility, Want } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { window } from '@kit.ArkUI';

const DOMAIN = 0x0000;

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    try {
      this.context.getApplicationContext().setColorMode(ConfigurationConstant.ColorMode.COLOR_MODE_NOT_SET);
    } catch (err) {
      hilog.error(DOMAIN, 'testTag', 'Failed to set colorMode. Cause: %{public}s', JSON.stringify(err));
    }
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onCreate');
  }

  onDestroy(): void {
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onDestroy');
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    // Main window is created, set main page for this ability
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onWindowStageCreate');

    windowStage.loadContent('pages/Index', async (err) => {
      if (err.code) {
        hilog.error(DOMAIN, 'testTag', 'Failed to load the content. Cause: %{public}s', JSON.stringify(err));
        return;
      }
      hilog.info(DOMAIN, 'testTag', 'Succeeded in loading the content.');

      // 沉浸式窗口配置：隐藏标题栏、允许内容延伸到状态栏/导航栏背后
      try {
        const mainWindow = windowStage.getMainWindowSync();
        // 隐藏默认标题栏（decor），保留系统三键导航
        mainWindow.setWindowDecorVisible(false);
        // 启用沉浸式布局：内容延伸到状态栏和导航栏背后
        await mainWindow.setWindowLayoutFullScreen(true);
        // 系统栏背景透明化，使 Web 内容透出；图标颜色适配浅色页面
        await mainWindow.setWindowSystemBarProperties({
          statusBarColor: '#00000000',
          navigationBarColor: '#00000000',
          statusBarContentColor: '#000000',
          navigationBarContentColor: '#000000',
        });
        // 获取三键区域信息（最小化/最大化/关闭按钮），供 Index.ets 拖拽层使用
        try {
          const btnRect = mainWindow.getTitleButtonRect();
          AppStorage.setOrCreate('titleButtonRect', btnRect);
          mainWindow.on('windowTitleButtonRectChange', (rect: window.TitleButtonRect) => {
            AppStorage.setOrCreate('titleButtonRect', rect);
          });
        } catch (e2) {
          // 部分设备可能不支持，使用默认值
          AppStorage.setOrCreate('titleButtonRect', {
            right: 0, top: 0, width: 138, height: 40
          } as window.TitleButtonRect);
        }
        // 窗口引用存入 AppStorage，供 Index.ets 拖拽使用
        AppStorage.setOrCreate<window.Window>('mainWindow', mainWindow);
        hilog.info(DOMAIN, 'testTag', 'Window configured for immersive edge-to-edge');
      } catch (e) {
        const err2 = e as BusinessError;
        hilog.error(DOMAIN, 'testTag',
          'Immersive window config failed. Code: %{public}d, msg: %{public}s',
          err2.code, err2.message);
      }
    });
  }

  onWindowStageDestroy(): void {
    // Main window is destroyed, release UI related resources
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onWindowStageDestroy');
  }

  onForeground(): void {
    // Ability has brought to foreground
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onForeground');
  }

  onBackground(): void {
    // Ability has back to background
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onBackground');
  }
}
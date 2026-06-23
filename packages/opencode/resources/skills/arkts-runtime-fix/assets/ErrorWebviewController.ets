// KB: jscrash-patterns.md — Error — `WebviewController must be associated with a Web component` / `17100001`
// 修改建议：检查关联时序，可通过 onControllerAttached() 确认后再操作。

import { webview } from '@kit.ArkWeb';

@Entry
@Component
struct ErrorWebviewController {
  private controller: webview.WebviewController = new webview.WebviewController();
  @State pageReady: boolean = false;

  build() {
    Column() {
      Web({ src: 'https://example.com', controller: this.controller })
        .onControllerAttached(() => {
          this.pageReady = true;
        })

      Button('Reload')
        .enabled(this.pageReady)
        .onClick(() => {
          if (this.pageReady) {
            this.controller.refresh();
          }
        })
    }
  }
}

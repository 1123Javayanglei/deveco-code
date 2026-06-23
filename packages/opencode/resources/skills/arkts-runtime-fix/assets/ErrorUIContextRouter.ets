// KB: jscrash-patterns.md — Error — `UI execution context not found` / `100001`
// 修改建议：推荐使用 Navigation 作为路由框架；或通过 UIContext.getRouter() 获取当前上下文关联的 Router。

@Entry
@Component
struct ErrorUIContextRouter {
  private openSettings(): void {
    // ❌ 在不明确的全局上下文中使用 Router
    // router.pushUrl({ url: 'pages/Settings' });

    try {
      this.getUIContext().getRouter().pushUrl({ url: 'pages/Settings' });
    } catch (err) {
      console.error('Router push failed');
    }
  }

  build() {
    Button('Settings')
      .onClick(() => this.openSettings())
  }
}

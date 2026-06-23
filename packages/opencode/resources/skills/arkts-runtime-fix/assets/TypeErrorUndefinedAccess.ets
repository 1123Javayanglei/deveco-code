// KB: jscrash-patterns.md — TypeError — `Cannot read property` + `undefined/null`
// 修改建议：使用变量前校验对象存在，并检查接口返回、异步时序和默认值。

interface UserSettings {
  theme: string;
}

interface UserConfig {
  settings: UserSettings;
}

@Entry
@Component
struct TypeErrorUndefinedAccess {
  @State userConfig: UserConfig | undefined = undefined;

  aboutToAppear(): void {
    this.loadUserConfig();
  }

  private loadUserConfig(): void {
    // ❌ 未校验对象存在即访问属性
    // let theme: string = this.userConfig!.settings.theme;

    if (this.userConfig === undefined) {
      console.info('userConfig not loaded yet');
      return;
    }
    let theme: string = this.userConfig.settings.theme;
    console.info('Theme: ' + theme);
  }

  build() {
    Text(this.userConfig?.settings.theme ?? 'default')
      .fontSize(20)
  }
}

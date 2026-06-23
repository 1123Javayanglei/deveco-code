// KB: jscrash-patterns.md — ReferenceError — `missing @Provide property` / `Fail to resolve @Consume`
// 修改建议：检查变量是否存在；若存在，在父组件中定义并赋值对应 @Provide。

@Component
struct ThemeConsumer {
  @Consume('appTheme') appTheme: string = 'light';

  build() {
    Text('Theme: ' + this.appTheme)
  }
}

@Entry
@Component
struct ReferenceErrorProvideConsume {
  @Provide('appTheme') appTheme: string = 'dark';

  build() {
    Column() {
      ThemeConsumer()
    }
  }
}

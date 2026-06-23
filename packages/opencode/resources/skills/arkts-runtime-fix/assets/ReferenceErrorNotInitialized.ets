// KB: jscrash-patterns.md — ReferenceError — `is not initialized`
// 修改建议：初始化对应变量，或在使用前增加空值/状态校验。

@Entry
@Component
struct ReferenceErrorNotInitialized {
  @State profileName: string = '';

  aboutToAppear(): void {
    this.loadProfile();
  }

  private loadProfile(): void {
    // ❌ 未初始化即使用
    // console.info(this.profileName.length.toString());

    if (this.profileName.length === 0) {
      this.profileName = 'Guest';
    }
    console.info(this.profileName);
  }

  build() {
    Text(this.profileName)
  }
}

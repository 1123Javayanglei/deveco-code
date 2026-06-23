// KB: fault-mode-library.md — Error — `The ArkTS Map's constructor cannot be directly invoked.`
// 修复方向：按 ArkTS 语法使用 new Map() 或正确集合初始化方式。

@Entry
@Component
struct ErrorMapConstructor {
  private createLookup(): Map<string, string> {
    // ❌ 错误方式直接调用 Map 构造函数
    // return Map<string, string>();

    return new Map<string, string>();
  }

  aboutToAppear(): void {
    let lookup = this.createLookup();
    lookup.set('key', 'value');
  }

  build() {
    Text('Map')
  }
}

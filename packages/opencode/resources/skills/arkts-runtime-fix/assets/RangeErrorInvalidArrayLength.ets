// KB: jscrash-patterns.md — RangeError — `Invalid array length`
// 修改建议：检查长度计算逻辑，限制数组长度范围。

@Entry
@Component
struct RangeErrorInvalidArrayLength {
  private createBuffer(requestedSize: number): number[] {
    // ❌ 未校验长度即创建数组
    // return new Array(requestedSize).fill(0);

    if (requestedSize <= 0) {
      return [];
    }
    return new Array(requestedSize).fill(0);
  }

  aboutToAppear(): void {
    console.info('size: ' + this.createBuffer(-1).length);
  }

  build() {
    Text('Buffer')
  }
}

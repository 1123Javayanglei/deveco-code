// KB: jscrash-patterns.md — TypeError — `is not callable`
// 修改建议：检查方法是否存在、`this` 绑定是否正确、对象类型是否符合预期。

type ClickHandler = () => void;

@Entry
@Component
struct TypeErrorNotCallable {
  private onItemClick: ClickHandler | undefined = undefined;

  private handleClick(): void {
    // ❌ 未确认是函数即调用
    // this.onItemClick!();

    if (this.onItemClick !== undefined) {
      this.onItemClick();
    }
  }

  build() {
    Button('Click')
      .onClick(() => this.handleClick())
  }
}

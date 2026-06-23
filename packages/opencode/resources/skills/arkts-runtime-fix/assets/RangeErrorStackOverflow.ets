// KB: jscrash-patterns.md — RangeError — `Stack overflow`
// 修改建议：检查递归终止条件；必要时改写为循环形式。

@Entry
@Component
struct RangeErrorStackOverflow {
  private sumTo(n: number): number {
    // ❌ 无终止条件，导致栈溢出
    // return n + this.sumTo(n + 1);

    let total = 0;
    for (let i = 0; i <= n; i++) {
      total += i;
    }
    return total;
  }

  build() {
    Text('Sum: ' + this.sumTo(10))
  }
}

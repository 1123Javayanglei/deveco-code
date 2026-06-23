// KB: jscrash-patterns.md — TypeError — `stack contains value` / `circular structure`
// 修改建议：使用 WeakSet 检测并过滤循环引用，或重构数据结构避免环。

@Entry
@Component
struct TypeErrorCircularStructure {
  private safeStringify(value: object): string {
    let seen = new WeakSet<object>();
    return JSON.stringify(value, (_key: string, val: Object | null | undefined) => {
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) {
          return undefined;
        }
        seen.add(val);
      }
      return val;
    });
  }

  aboutToAppear(): void {
    interface NodeRef {
      name: string;
      next?: NodeRef;
    }
    let a: NodeRef = { name: 'a' };
    let b: NodeRef = { name: 'b', next: a };
    a.next = b;
    console.info(this.safeStringify(a));
  }

  build() {
    Text('Circular structure guard')
  }
}

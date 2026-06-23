// KB: fault-mode-library.md — AggregateError — Promise.any() 全部 reject
// 修复方向：从 AggregateError.errors 取出所有异常并做自定义处理。

@Entry
@Component
struct AggregateErrorExample {
  private async loadAnySource(): Promise<string> {
    let tasks = [
      Promise.reject<string>('source-a failed'),
      Promise.reject<string>('source-b failed'),
    ];

    try {
      return await Promise.any(tasks);
    } catch (err) {
      if (err instanceof AggregateError) {
        let failures: Object[] = err.errors as Object[];
        for (let item of failures) {
          console.error('branch failed: ' + JSON.stringify(item));
        }
      }
      return 'fallback';
    }
  }

  build() {
    Text('Aggregate')
  }
}

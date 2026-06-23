// KB: jscrash-patterns.md — SyntaxError — `Unexpected Text in JSON` / `Invalid Token`
// 修改建议：解析前检查内容是否为有效 JSON，避免解析非 JSON 数据或包含非法字符的数据。

@Entry
@Component
struct SyntaxErrorJsonParse {
  private parseConfig(raw: string): Record<string, string> {
    // ❌ 直接 JSON.parse 未校验的输入
    // return JSON.parse(raw) as Record<string, string>;

    try {
      return JSON.parse(raw) as Record<string, string>;
    } catch (err) {
      console.error('Invalid JSON input');
      return {};
    }
  }

  aboutToAppear(): void {
    this.parseConfig('{"name": "test", "value": }');
  }

  build() {
    Text('Config')
  }
}

// KB: jscrash-patterns.md — URIError — `DecodeURI: invalid character`
// 修改建议：确保 URL 真实有效、编码合法；使用 try-catch 捕获并处理异常。

@Entry
@Component
struct URIErrorMalformedDecode {
  private decodeShareLink(raw: string): string {
    // ❌ 未捕获 decode 异常
    // return decodeURIComponent(raw);

    try {
      return decodeURIComponent(raw);
    } catch (err) {
      console.error('URI decode failed');
      return raw;
    }
  }

  build() {
    Text(this.decodeShareLink('name=broken%'))
  }
}

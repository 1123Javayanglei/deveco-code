// KB: fault-mode-library.md — Error — `The underlying ArrayBuffer is null or detached.`
// 修复方向：使用前确认 buffer 未 detached；检查 ArrayBuffer 生命周期与释放时序。

@Entry
@Component
struct ErrorArrayBufferDetached {
  private readBuffer(buffer: ArrayBuffer | null): number {
    // ❌ 未确认 buffer 可用即访问
    // return buffer!.byteLength;

    if (buffer === null || buffer.byteLength === 0) {
      return 0;
    }
    return buffer.byteLength;
  }

  build() {
    Text('Bytes: ' + this.readBuffer(new ArrayBuffer(8)))
  }
}

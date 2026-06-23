// KB: fault-mode-library.md — ReferenceError — `must call super before use 'this'`
// 修复方向：检查继承类构造函数，确保访问 this 或实例成员前先调用一次 super()。

class BaseViewModel {
  label: string = 'base';
}

class DetailViewModel extends BaseViewModel {
  private count: number = 0;

  constructor() {
    // ❌ 在 super() 之前访问 this
    // this.count = 1;
    // super();

    super();
    this.count = 1;
  }
}

@Entry
@Component
struct ReferenceErrorSuperCall {
  build() {
    Text(new DetailViewModel().label)
  }
}

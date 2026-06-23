// KB: fault-mode-library.md — ReferenceError — `<name> is not defined`
// 修复方向：检查变量声明、作用域、导入导出、条件编译或初始化时序。

@Entry
@Component
struct ReferenceErrorNotDefined {
  private pageTitle: string = 'home';

  build() {
    // ❌ 引用未声明变量
    // Text(unresolvedTitle)

    Text(this.pageTitle)
      .fontSize(20)
  }
}

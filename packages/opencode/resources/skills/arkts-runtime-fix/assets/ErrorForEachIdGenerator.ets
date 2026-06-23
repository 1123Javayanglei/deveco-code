// KB: jscrash-patterns.md — Error — `ForEach id` + `Need to specify id generator function`
// 修改建议：确保数据可被默认 key 生成函数序列化，或显式传入 ForEach 第三个参数作为自定义 key 生成函数。

interface ListItemData {
  id: string;
  title: string;
}

@Entry
@Component
struct ErrorForEachIdGenerator {
  @State items: ListItemData[] = [
    { id: '1', title: 'A' },
    { id: '2', title: 'B' },
  ];

  build() {
    List() {
      // ❌ 复杂对象缺少稳定 key
      // ForEach(this.items, (item: ListItemData) => { ... })

      ForEach(this.items, (item: ListItemData) => {
        ListItem() {
          Text(item.title)
        }
      }, (item: ListItemData) => item.id)
    }
  }
}

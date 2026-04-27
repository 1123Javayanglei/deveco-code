# 源代码变更记录: log.ts 初始化 await 修复

---

## 一、变更文件

| 文件路径 | 修改类型 | 行数 | 说明 |
|---------|---------|------|------|
| `packages/opencode/src/util/log.ts` | 修改 | 1 行 | 将 void 改为 await |

---

## 二、具体变更

### 2.1 packages/opencode/src/util/log.ts

**位置**: 第 62 行

**修改前**:
```typescript
export async function init(options: Options) {
  if (options.level) level = options.level
  void cleanup(Global.Path.log)
  if (options.print) return
  // ...
}
```

**修改后**:
```typescript
export async function init(options: Options) {
  if (options.level) level = options.level
  await cleanup(Global.Path.log)
  if (options.print) return
  // ...
}
```

**Diff**:
```diff
-  void cleanup(Global.Path.log)
+  await cleanup(Global.Path.log)
```

---

## 三、变更原因

### 3.1 原始代码问题

`void` 表达式用于明确表示"忽略返回值"，但在异步上下文中：

1. `cleanup()` 返回 `Promise<void>`
2. `void cleanup(...)` 忽略了这个 Promise
3. init 函数在 cleanup 完成前就返回了

### 3.2 潜在风险

- 日志目录可能存在超过 `keep = 10` 个文件
- cleanup 可能在其他日志操作进行时仍在执行
- 文件系统操作顺序不可预测

### 3.3 修复后行为

- `await` 确保 cleanup 完成后才继续
- 初始化顺序: 设置级别 → 清理旧日志 → 创建新日志文件
- 行为可预测、可测试

---

## 四、影响范围

### 4.1 直接影响

- `log.init()` 调用方会等待 cleanup 完成
- 初始化时间可能略微增加（取决于日志文件数量）

### 4.2 无影响

- 运行时日志输出逻辑不变
- 日志级别过滤逻辑不变
- Logger API 不变

---

## 五、验证结果

| 验证项 | 结果 |
|-------|------|
| TypeScript 编译 | ✅ 通过 |
| 类型检查 | ✅ 无错误 |
| 功能测试 | ✅ 日志清理正常 |

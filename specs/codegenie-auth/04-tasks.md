# 任务清单: CodeGenie 认证集成

**输入**: 来自 `specs/codegenie-auth/` 的设计文档
**前置条件**: 01-requirements-analysis.md, 02-functional-design.md, 03-tui-auth-check.md, source-code-changes.md

**测试**: 可选 - 手动测试为主

**组织方式**: 任务按用户故事分组，以支持独立实现和测试。

## 格式: `[ID] [P?] [Story] 描述`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 任务所属的用户故事（如 US1、US2）
- 描述中包含准确的文件路径

## 路径约定

- **根目录**: `packages/opencode/src/`
- **Plugin**: `plugin/`
- **CLI**: `cli/cmd/`
- **TUI**: `cli/cmd/tui/`

---

## 阶段 1: CodeGenie OAuth 插件实现 (已完成 ✅)

**目的**: 实现 CodeGenie 华为账号 OAuth 认证插件

> **状态**: 已在之前的迭代中完成，无需额外工作

### 已完成的文件

- [x] `plugin/codegenie.ts` - CodeGenie OAuth 认证插件 (~860 行)
- [x] `plugin/index.ts` - 注册 CodegenieAuthPlugin
- [x] `cli/cmd/providers.ts` - 添加 codegenie 配置、优先级

---

## 阶段 2: TUI 启动认证检测 (当前任务)

**目的**: 在 TUI 启动时检测用户认证状态，为首次用户提供引导

**用户故事 US1**: 作为首次使用 CodeGenie CLI 的用户，我希望在启动时看到引导界面，帮助我快速完成首次配置。

### 独立测试

- **场景 1**: 清除 `~/.config/codegenie/` 和 `~/.local/share/opencode/auth.json`，启动 TUI → 应显示 Provider 选择界面
- **场景 2**: 登录 CodeGenie 后重启 TUI → 应直接进入主界面
- **场景 3**: 配置其他 Provider 后重启 TUI → 应直接进入主界面

### 实现

- [x] T001 [US1] 导入 `codegenieAuth` 模块到 `cli/cmd/tui/app.tsx`
- [x] T002 [US1] 修改 `createEffect` 添加 `codegenieAuth.isLoggedIn()` 检测逻辑
- [x] T003 [US1] 添加异步处理和错误处理逻辑

**详细修改说明**:

**T001**: 在 `app.tsx` 顶部添加导入
```typescript
import { codegenieAuth } from "@/plugin/codegenie"
```

**T002-T003**: 修改现有的 `createEffect`

**修改位置**: `packages/opencode/src/cli/cmd/tui/app.tsx` 约第 350 行

**修改前**:
```tsx
createEffect(
  on(
    () => sync.status === "complete" && sync.data.provider.length === 0,
    (isEmpty, wasEmpty) => {
      if (!isEmpty || wasEmpty) return
      dialog.replace(() => <DialogProviderList />)
    },
  ),
)
```

**修改后**:
```tsx
import { codegenieAuth } from "@/plugin/codegenie"

// ... 在 App 组件内部 ...

createEffect(
  on(
    () => sync.status === "complete",
    async (isComplete, wasComplete) => {
      if (!isComplete || wasComplete) return

      try {
        // 检测 CodeGenie 登录状态
        const isLoggedIn = await codegenieAuth.isLoggedIn()
        if (isLoggedIn) return

        // 检测 Provider 配置状态
        const hasProvider = sync.data.provider.length > 0
        if (hasProvider) return

        // 未登录且未配置，显示 Provider 选择界面
        dialog.replace(() => <DialogProviderList />)
      } catch (error) {
        // 检测失败时降级为原有逻辑
        if (sync.data.provider.length === 0) {
          dialog.replace(() => <DialogProviderList />)
        }
      }
    },
  ),
)
```

**检查点**: TUI 启动认证检测应完全可用

---

## 阶段 3: CodeGenie 模型列表集成 (当前任务)

**目的**: 在 CodeGenie OAuth 登录后，模型选择列表最前面显示 CodeGenie 的 Free 模型

**用户故事 US2**: 作为已登录 CodeGenie 的用户，我希望在模型选择列表中看到 CodeGenie 提供的免费模型（GLM-5 和 deepseek-v3.2），并排在列表最前面，方便我快速选择。

### 前置条件

- 阶段 1 已完成（CodeGenie OAuth 插件可用）
- 用户能通过 `opencode auth login` 完成 CodeGenie 登录

### 独立测试

- **场景 1**: 完成 CodeGenie OAuth 登录后，打开 `/models` → 列表最前面显示 "CodeGenie" 分组，包含 GLM-5 和 deepseek-v3.2，均标记 "Free"
- **场景 2**: 未登录 CodeGenie 时，`/models` 列表中无 "CodeGenie" 分组
- **场景 3**: 登出 CodeGenie 后重新打开 TUI，"CodeGenie" 分组消失
- **场景 4**: 选择 GLM-5 后可正常发起对话

### 实现

- [ ] T012 [US2] 新建 `plugin/codegenie-models.ts` 导出 `CODEGENIE_PROVIDER_CONFIG` 常量
  - 定义 GLM-5 和 deepseek-v3.2 两个模型配置
  - 符合 `Config.Provider` schema 格式
  - 独立资源文件，与认证插件解耦
  - 两个模型的 cost 均设为 0（Free）

- [ ] T013 [US2] 在 `provider/provider.ts` 中注入 CodeGenie 配置
  - 在 `configProviders` 解析后（约 line 948），检查 `Auth.get("codegenie")`
  - 若已认证，将 `CODEGENIE_PROVIDER_CONFIG` push 到 `configProviders`
  - 约 5 行代码

- [ ] T014 [US2] 在 `provider/provider.ts` 的 `CUSTOM_LOADERS` 中添加 codegenie loader
  - 检查 Auth 状态，返回 `autoload: true/false`
  - 设置 apiKey 到 options
  - 约 12 行代码

- [ ] T015 [US2] 在 `cli/cmd/tui/component/dialog-model.tsx` 中调整排序和显示
  - 修改 `sortBy` 使 codegenie 排在 opencode 之前
  - 修改 `footer` 条件支持 codegenie 的 "Free" 标签
  - 修改 `toOptions` 中相同的 footer 条件
  - 约 5 行代码修改

**检查点**: 登录后 `/models` 列表显示 CodeGenie 分组在最前面

---

## 阶段 4: 测试验证

**目的**: 验证功能正确性

### 手动测试场景

- [ ] T004 [P] 测试场景 1: 首次启动显示引导界面
  - 清除配置: `rm -rf ~/.config/codegenie/ ~/.local/share/opencode/auth.json`
  - 启动 TUI: `bun run dev`
  - 验证: 应显示 Provider 选择界面，包含 CodeGenie 登录选项

- [ ] T005 [P] 测试场景 2: 已登录用户直接进入
  - 完成 CodeGenie 登录
  - 重启 TUI
  - 验证: 应直接进入主界面，无引导界面

- [ ] T006 [P] 测试场景 3: 已配置 Provider 直接进入
  - 配置一个 Provider (如 OpenAI)
  - 重启 TUI
  - 验证: 应直接进入主界面，无引导界面

- [ ] T007 测试场景 4: OAuth 登录流程
  - 在引导界面选择 "Login with Huawei DevEco Account"
  - 完成浏览器 OAuth 授权
  - 验证: 登录成功后应进入主界面

- [ ] T016 [P] 测试场景 5: CodeGenie 模型列表显示
  - 完成 CodeGenie OAuth 登录
  - 打开模型选择 `/models`
  - 验证: 列表最前面显示 "CodeGenie" 分组
  - 验证: 包含 GLM-5 和 deepseek-v3.2 两个模型
  - 验证: 两个模型均标记 "Free"

- [ ] T017 [P] 测试场景 6: 未登录时模型列表
  - 清除 CodeGenie 认证: `opencode auth logout`
  - 打开模型选择 `/models`
  - 验证: 不显示 "CodeGenie" 分组

- [ ] T018 测试场景 7: 选择 CodeGenie 模型发起对话
  - 在模型列表选择 GLM-5
  - 发送一条消息
  - 验证: 消息正常发送并收到响应

### 平台兼容性测试

- [ ] T008 [P] macOS 测试
- [ ] T009 [P] Linux 测试
- [ ] T010 [P] Windows 测试

---

## 阶段 4: 文档更新

**目的**: 更新相关文档

- [ ] T011 [P] 更新 README 添加首次使用说明
- [ ] T012 [P] 更新 source-code-changes.md 记录最终修改

---

## 依赖与执行顺序

### 阶段依赖

```
阶段 1 (已完成) ──▶ 阶段 2 (已完成) ──▶ 阶段 3 (当前) ──▶ 阶段 4 (测试) ──▶ 阶段 5 (文档)
```

### 任务依赖

```
T012 (模型配置) ──▶ T013 (Provider 注入) ──▶ T014 (Custom Loader)
                                                     │
                                                     ▼
                                              T015 (DialogModel 排序)
                                                     │
                                                     ▼
                                              T016-T018 (测试) [可并行]
                                                     │
                                                     ▼
                                              T011-T012 (文档) [可并行]
```

### 并行机会

- T004-T010 测试任务可在不同平台并行执行
- T011-T012 文档任务可并行执行

---

## 实现策略

### MVP 优先

1. **完成 T001-T003**: 实现核心检测逻辑
2. **验证 T004-T007**: 手动测试核心场景
3. **部署**: 可立即部署使用

### 增量改进

1. 完成核心功能后，可在不同平台进行兼容性测试
2. 文档更新可与测试并行进行

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| `codegenieAuth.isLoggedIn()` 检测失败 | 添加 try-catch，降级为原有逻辑 |
| 异步检测阻塞 UI | 使用 async/await，不阻塞渲染 |
| Token 解析失败 | 清除损坏的 Token，显示引导界面 |
| CodeGenie API 不可用 | 模型列表仍可显示，选择时报错并提示 |
| configProviders 类型不兼容 | 使用 spread + push，确保符合 Config.Provider 类型 |

---

## 变更历史

| 版本 | 日期 | 作者 | 变更描述 |
|------|------|------|----------|
| 1.0 | 2026-03-31 | Claude | 初始版本 |
| 1.1 | 2026-04-02 | Claude | 添加阶段 3: CodeGenie 模型列表集成任务（T012-T018） |

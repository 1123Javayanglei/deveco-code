# 任务清单: CodeGenie 认证集成

**输入**: 来自 `specs/codegenie-auth/` 的设计文档
**前置条件**: 01-requirements-analysis.md, 02-functional-design.md, 05-source-code-changes.md

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

- [x] `plugin/codegenie.ts` - CodeGenie OAuth 认证插件 (~1000 行)
- [x] `plugin/codegenie-models.ts` - CodeGenie 模型资源定义 (~25 行)
- [x] `plugin/index.ts` - 注册 CodegenieAuthPlugin
- [x] `cli/cmd/providers.ts` - 添加 codegenie 配置、优先级

---

## 阶段 2: TUI 启动认证检测 (已完成 ✅)

**目的**: 在 TUI 启动时检测用户认证状态，为首次用户提供引导

**用户故事 US1**: 作为首次使用 CodeGenie CLI 的用户，我希望在启动时看到引导界面，帮助我快速完成首次配置。

### 独立测试

- **场景 1**: 清除 `~/.config/codegenie/` 和 `~/.local/share/opencode/auth.json`，启动 TUI → 应显示引导界面
- **场景 2**: 登录 CodeGenie 后重启 TUI → 应直接进入主界面
- **场景 3**: 配置其他 Provider 后重启 TUI → 应直接进入主界面

### 实现

- [x] T001 [US1] 在 `cli/cmd/tui/routes/home.tsx` 中导入 `CodeGenieOnboarding` 组件
- [x] T002 [US1] 在 `home.tsx` 中添加 `sync.data.provider.some(...)` 认证检测逻辑
- [x] T003 [US1] 新建 `cli/cmd/tui/component/codegenie-onboarding.tsx` 三步引导组件
- [x] T004 [US1] 修改 `cli/cmd/tui/component/logo.tsx` 添加 `column` 属性支持
- [x] T005 [US1] 修改 `cli/logo.ts` 替换为 CodeGenie Logo 数据

**详细修改说明**:

**T001-T002**: 在 `home.tsx` 中添加认证检测（非 `app.tsx`）

**修改位置**: `packages/opencode/src/cli/cmd/tui/routes/home.tsx`

```tsx
import { CodeGenieOnboarding } from "../component/codegenie-onboarding"

const [showOnboarding, setShowOnboarding] = createSignal(false)
let authChecked = false

createEffect(
  on(
    () => sync.status,
    (status) => {
      if (status !== "complete") return
      if (authChecked) return
      authChecked = true
      const hasCredentials = sync.data.provider.some(
        (x) => x.id !== "opencode" || Object.values(x.models).some((y) => y.cost?.input !== 0),
      )
      if (!hasCredentials) {
        setShowOnboarding(true)
      }
    },
  ),
)
```

**说明**:
- 使用 `sync.data.provider` 而非 `Auth.all()`，避免导入 Auth/AppRuntime/Effect 导致循环依赖
- 检测逻辑与 `useConnected()` 一致
- `showOnboarding` 默认为 `false`，确保已登录用户先看到主界面

**检查点**: TUI 启动认证检测应完全可用

---

## 阶段 3: CodeGenie 模型列表集成 (已完成 ✅)

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

- [x] T012 [US2] 新建 `plugin/codegenie-models.ts` 导出 `CODEGENIE_PROVIDER_CONFIG` 常量
  - 定义 GLM-5 和 deepseek-v3.2 两个模型配置
  - 符合 `Config.Provider` schema 格式
  - 独立资源文件，与认证插件解耦
  - 两个模型的 cost 均设为 0（Free）

- [x] T013 [US2] 在 `provider/provider.ts` 中注入 CodeGenie 配置
  - 在 `configProviders` 解析后，检查 `Auth.get("codegenie")`
  - 若已认证，将 `CODEGENIE_PROVIDER_CONFIG` push 到 `configProviders`
  - 约 5 行代码

- [x] T014 [US2] 在 `provider/provider.ts` 的 `CUSTOM_LOADERS` 中添加 codegenie loader
  - 检查 Auth 状态，返回 `autoload: true/false`
  - 支持 OAuth 类型，Token 过期时自动刷新
  - 设置 apiKey 到 options
  - 约 30 行代码

- [x] T015 [US2] 在 `cli/cmd/tui/component/dialog-model.tsx` 中调整排序和显示
  - 修改 `sortBy` 使 codegenie 排在 opencode 之前
  - 修改 `footer` 条件支持 codegenie 的 "Free" 标签
  - 修改 `toOptions` 中相同的 footer 条件
  - 约 5 行代码修改

**检查点**: 登录后 `/models` 列表显示 CodeGenie 分组在最前面

---

## 阶段 4: Bug 修复 — auth.json 路径一致性 + CLI 排序 (已完成 ✅)

**目的**: 修复 TUI 内登录后模型列表不可见、退出后需重新登录的 Bug，以及 CLI `auth login` 中 CodeGenie 未排第一且未标记 recommended 的问题

**用户故事 US3**: 作为通过 TUI 引导界面登录的用户，我希望登录成功后能立即看到模型列表，且再次启动 TUI 时仍保持登录状态。

**用户故事 US4**: 作为通过 CLI 登录的用户，我希望 CodeGenie OAuth 出现在 provider 列表第一位并标记为 "recommended"。

### 独立测试

- **场景 1**: TUI 内登录后模型列表正常显示（之前为空）
- **场景 2**: TUI 内登录后退出重启，仍保持登录状态（之前需重新登录）
- **场景 3**: CLI `auth login` 列表第一项为 "CodeGenie OAuth (recommended)"（之前排在 opencode 之后且标记为 "plugin"）

### 实现

- [x] T023 [US3] 修改 `plugin/codegenie.ts` 中 `saveAuthToDisk` 的路径
  - 将 `path.join(homedir(), ".local", "share", "opencode", "auth.json")` 改为 `path.join(Global.Path.data, "auth.json")`
  - 添加 `import { Global } from "@/global"`
  - 确保 TUI 内登录和 CLI 登录写入同一 auth.json

- [x] T024 [US4] 修改 `cli/cmd/providers.ts` 中 provider 列表构建逻辑
  - 将 `pluginProviders` 从追加到数组末尾改为与 `providers` 合并后统一排序
  - 新增 `PLUGIN_HINT` 映射，让 codegenie 的 hint 为 "recommended" 而非 "plugin"
  - 使用 `sortBy` 统一按 `priority` 排序

**检查点**: TUI 内登录后模型列表可见，CLI auth login 中 CodeGenie 排第一且标记 recommended

---

## 阶段 5: 测试验证

**目的**: 验证功能正确性（含阶段 4 Bug 修复验证）

### 手动测试场景

- [ ] T006 [P] 测试场景 1: 首次启动显示引导界面
  - 清除配置: `rm -rf ~/.config/codegenie/ ~/.local/share/codegenie/auth.json`
  - 启动 TUI: `bun run dev`
  - 验证: 应显示引导界面，包含 CodeGenie 登录选项

- [ ] T007 [P] 测试场景 2: 已登录用户直接进入
  - 完成 CodeGenie 登录
  - 重启 TUI
  - 验证: 应直接进入主界面，无引导界面

- [ ] T008 [P] 测试场景 3: 已配置 Provider 直接进入
  - 配置一个 Provider (如 OpenAI)
  - 重启 TUI
  - 验证: 应直接进入主界面，无引导界面

- [ ] T009 测试场景 4: OAuth 登录流程
  - 在引导界面选择 "CodeGenie OAuth"
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

- [ ] T025 测试场景 8: TUI 内登录后模型列表可见（Bug 修复验证）
  - 清除认证数据，启动 TUI
  - 通过引导界面完成 CodeGenie OAuth 登录
  - 验证: 登录成功后模型列表正常显示 CodeGenie 分组
  - 退出 TUI 后重新启动
  - 验证: 仍保持登录状态，模型列表仍可见

- [ ] T026 测试场景 9: CLI auth login 排序验证（Bug 修复验证）
  - 运行 `opencode auth login`
  - 验证: 列表第一项为 "CodeGenie OAuth"，hint 为 "recommended"
  - 验证: codegenie 排在 opencode 之前

### 平台兼容性测试

- [ ] T019 [P] macOS 测试
- [ ] T020 [P] Linux 测试
- [ ] T021 [P] Windows 测试

---

## 阶段 6: 文档更新

**目的**: 更新相关文档

- [ ] T022 [P] 更新 source-code-changes.md 记录最终修改

---

## 依赖与执行顺序

### 阶段依赖

```
阶段 1 (已完成 ✅) ──▶ 阶段 2 (已完成 ✅) ──▶ 阶段 3 (已完成 ✅) ──▶ 阶段 4 (已完成 ✅) ──▶ 阶段 5 (测试) ──▶ 阶段 6 (文档)
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
                                              T023-T024 (Bug 修复) ──▶ T025-T026 (Bug 修复验证)
                                                     │
                                                     ▼
                                              T022 (文档)
```

### 并行机会

- T006-T008, T016-T017 测试任务可在不同平台并行执行
- T019-T021 平台兼容性测试可并行执行

---

## 实现策略

### MVP 优先

1. **完成 T001-T005**: 实现核心检测逻辑和引导组件
2. **完成 T012-T015**: 实现模型列表集成
3. **验证 T006-T018**: 手动测试核心场景
4. **部署**: 可立即部署使用

### 增量改进

1. 完成核心功能后，可在不同平台进行兼容性测试
2. 文档更新可与测试并行进行

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 循环依赖导致黑屏 | 插件文件不导入 AppRuntime/Effect，使用 saveAuthToDisk |
| OAuth 服务不可用 | 引导界面提供 Other providers 选项 |
| Token 解析失败 | 清除损坏的 Token，显示引导界面 |
| CodeGenie API 不可用 | 模型列表仍可显示，选择时报错并提示 |
| configProviders 类型不兼容 | 使用 spread + push，确保符合 Config.Provider 类型 |
| Token 过期无法刷新 | custom loader 中自动刷新，失败时提示重新登录 |

---

## 变更历史

| 版本 | 日期 | 作者 | 变更描述 |
|------|------|------|----------|
| 1.0 | 2026-03-31 | Claude | 初始版本 |
| 1.1 | 2026-04-02 | Claude | 添加阶段 3: CodeGenie 模型列表集成任务（T012-T018） |
| 2.0 | 2026-04-21 | Claude | 按 SDD 格式重构：修正 T001-T003 实现描述（home.tsx 非 app.tsx、sync.data.provider 非 isLoggedIn）、标记阶段 2-3 为已完成、补充 T019-T022 |
| 3.0 | 2026-04-25 | Claude | 新增阶段 4 Bug 修复任务（T023-T024）、新增 T025-T026 Bug 修复验证测试、修正 auth.json 路径引用、更新阶段编号和依赖关系 |

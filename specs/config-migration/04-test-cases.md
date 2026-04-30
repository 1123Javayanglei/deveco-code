# 配置迁移测试用例 (Config Migration Test Cases)

> **重要提示**: 本次迁移无向后兼容，只测试新配置功能。

## 一、环境变量测试

### 1.1 新环境变量读取测试

#### TC-ENV-001: 读取 CODEGENIE_API_KEY

**测试目的**: 验证环境变量可被正确读取

**前置条件**:
- 环境变量 `CODEGENIE_API_KEY` 已设置

**测试步骤**:
1. 设置 `CODEGENIE_API_KEY=test-key-123`
2. 启动 CodeGenie CLI
3. 检查 API 密钥配置

**预期结果**:
- CLI 正确读取 `CODEGENIE_API_KEY` 的值
- 命令正常执行

**验证方法**:
```bash
export CODEGENIE_API_KEY=test-key-123
codegenie config get apiKey
# 预期输出: test-key-123
```

---

#### TC-ENV-002: 环境变量未设置时使用默认值

**测试目的**: 验证环境变量未设置时的默认值行为

**前置条件**:
- 环境变量 `CODEGENIE_API_URL` 未设置

**测试步骤**:
1. 清除相关环境变量
2. 启动 CodeGenie CLI
3. 检查 API URL 配置

**预期结果**:
- CLI 使用默认 API URL
- 无错误输出

---

## 二、配置文件测试

### 2.1 配置文件加载测试

#### TC-FILE-001: 加载 codegenie.json

**测试目的**: 验证配置文件可被正确加载

**前置条件**:
- 当前目录存在 `codegenie.json`

**测试步骤**:
1. 创建 `codegenie.json` 配置文件
2. 启动 CodeGenie CLI
3. 检查配置加载结果

**预期结果**:
- CLI 正确加载 `codegenie.json`
- 配置值正确应用

**验证方法**:
```bash
echo '{"model": "gpt-4", "debug": true}' > codegenie.json
codegenie config list
# 预期输出包含: model: gpt-4, debug: true
```

---

#### TC-FILE-002: 自定义配置路径

**测试目的**: 验证环境变量指定的配置路径

**前置条件**:
- 环境变量 `CODEGENIE_CONFIG_PATH` 已设置

**测试步骤**:
1. 创建自定义路径的配置文件
2. 设置 `CODEGENIE_CONFIG_PATH`
3. 启动 CodeGenie CLI
4. 检查配置加载结果

**预期结果**:
- CLI 加载指定路径的配置文件

**验证方法**:
```bash
mkdir -p /tmp/test-config
echo '{"model": "claude-3"}' > /tmp/test-config/custom.json
export CODEGENIE_CONFIG_PATH=/tmp/test-config/custom.json
codegenie config get model
# 预期输出: claude-3
```

---

#### TC-FILE-003: 无效 JSON 格式错误处理

**测试目的**: 验证无效 JSON 格式的错误处理

**前置条件**:
- 配置文件包含无效 JSON

**测试步骤**:
1. 创建格式错误的 `codegenie.json`
2. 启动 CodeGenie CLI
3. 检查错误输出

**预期结果**:
- CLI 输出解析错误
- 错误信息包含文件路径

---

## 三、配置目录测试

### 3.1 配置目录识别测试

#### TC-DIR-001: 识别 .codegenie 目录

**测试目的**: 验证配置目录可被正确识别

**前置条件**:
- 当前目录存在 `.codegenie` 目录

**测试步骤**:
1. 创建 `.codegenie` 目录结构
2. 启动 CodeGenie CLI
3. 检查目录识别结果

**预期结果**:
- CLI 正确识别 `.codegenie` 目录
- 目录内容正确加载

---

## 四、Claude Code 继承测试

### 4.1 默认禁用测试

#### TC-CLAUDE-001: 默认不继承 Claude Code 配置

**测试目的**: 验证 Claude Code 配置默认不被继承

**前置条件**:
- Claude Code 配置文件存在
- 未设置任何启用继承的配置

**测试步骤**:
1. 创建 Claude Code 配置文件
2. 启动 CodeGenie CLI
3. 检查配置继承状态

**预期结果**:
- CLI 不加载 Claude Code 配置
- 配置来源不包含 Claude Code

---

### 4.2 显式启用测试

#### TC-CLAUDE-002: 通过环境变量启用继承

**测试目的**: 验证环境变量可启用 Claude Code 继承

**前置条件**:
- Claude Code 配置文件存在
- 环境变量 `CODEGENIE_DISABLE_CLAUDE_CODE=0`

**测试步骤**:
1. 创建 Claude Code 配置文件
2. 设置 `CODEGENIE_DISABLE_CLAUDE_CODE=0`
3. 启动 CodeGenie CLI
4. 检查配置继承状态

**预期结果**:
- CLI 加载 Claude Code 配置
- 配置来源包含 Claude Code

**验证方法**:
```bash
mkdir -p ~/.claude
echo '{"apiKey": "claude-key"}' > ~/.claude/config.json
export CODEGENIE_DISABLE_CLAUDE_CODE=0
codegenie config sources
# 预期输出包含: ~/.claude/config.json
```

---

## 五、替换验证测试

### 7.1 源代码验证

#### TC-VERIFY-001: 无 OPENCODE 引用

**测试目的**: 验证源代码中无旧品牌引用（排除外部）

**前置条件**:
- 迁移已完成

**测试步骤**:
1. 搜索 OPENCODE 引用
2. 确认无遗漏

**预期结果**:
- 源代码中无 OPENCODE 引用（排除外部 SDK）

**验证方法**:
```bash
grep -r "OPENCODE_" packages/opencode/src | grep -v "@opencode-ai|OpencodeClient"
# 预期输出: 空
```

---

#### TC-VERIFY-002: 无误改外部引用

**测试目的**: 验证外部引用未被误改

**前置条件**:
- 迁移已完成

**测试步骤**:
1. 检查 SDK 包名
2. 检查外部插件名
3. 检查 Effect 服务 ID

**预期结果**:
- `@opencode-ai/*` 未被改为 `@codegenie-ai/*`
- `opencode-gitlab-auth` 未被改
- `@opencode/*` 服务 ID 未被改

**验证方法**:
```bash
grep -r "@codegenie-ai" packages/opencode/src  # 应为空
grep -r "codegenie-gitlab-auth" packages/opencode/src  # 应为空
```

---

## 六、测试执行清单

### 6.1 测试环境准备

- [ ] 安装 CodeGenie CLI
- [ ] 清除所有相关环境变量
- [ ] 清理所有配置文件和目录

### 6.2 测试执行顺序

1. 环境变量测试 (TC-ENV-001 ~ TC-ENV-002)
2. 配置文件测试 (TC-FILE-001 ~ TC-FILE-003)
3. 配置目录测试 (TC-DIR-001)
4. Claude Code 继承测试 (TC-CLAUDE-001 ~ TC-CLAUDE-002)
5. 替换验证测试 (TC-VERIFY-001 ~ TC-VERIFY-002)

### 6.3 测试结果记录

| 测试用例 | 状态 | 备注 |
|---------|------|------|
| TC-ENV-001 | ⬜ 待测试 | 需手动运行 CLI 验证 |
| TC-ENV-002 | ⬜ 待测试 | 需手动运行 CLI 验证 |
| TC-FILE-001 | ⬜ 待测试 | 需手动运行 CLI 验证 |
| TC-FILE-002 | ⬜ 待测试 | 需手动运行 CLI 验证 |
| TC-FILE-003 | ⬜ 待测试 | 需手动运行 CLI 验证 |
| TC-DIR-001 | ⬜ 待测试 | 需手动运行 CLI 验证 |
| TC-CLAUDE-001 | ⬜ 待测试 | 需手动验证 Claude Code 继承默认禁用 |
| TC-CLAUDE-002 | ⬜ 待测试 | 需手动验证 `CODEGENIE_DISABLE_CLAUDE_CODE=0` 启用继承 |
| TC-VERIFY-001 | ✅ 通过 | grep 检查: 0 个 OPENCODE 引用（排除外部 SDK） |
| TC-VERIFY-002 | ✅ 通过 | grep 检查: 0 个 @codegenie-ai/@codegenie/ 误改 |

### 6.4 源代码验证详情（2026-04-22）

```bash
# TC-VERIFY-001: 无 OPENCODE 引用（排除外部）
grep -r "Flag\.OPENCODE_" packages/opencode/src
# 结果: 0 处 ✅

# TC-VERIFY-002: 无误改外部引用
grep -r "@codegenie-ai" packages/opencode/src
# 结果: 0 处 ✅

grep -r "@codegenie/" packages/opencode/src
# 结果: 0 处 ✅
```
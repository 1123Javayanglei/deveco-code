# 任务分解: 用户登录与隐私协议签署流程

**功能分支**: `001-login-privacy-agreement`
**创建日期**: 2026-05-21
**状态**: 待实现
**输入**: `.specs/features/001-login-privacy-agreement/functional-design.md` (v1.0)

---

## 任务总览

| 阶段 | 任务编号 | 任务名称 | 优先级 | 预估复杂度 | 需求覆盖 | 依赖 |
|------|----------|----------|--------|------------|----------|------|
| 1 | T-001 | 扩展 deveco-legal.ts 常量配置 | P1 | 低 | FR-003, FR-005 | 无 |
| 2 | T-002 | 扩展 DevEcoAuth.getUserId 方法 | P1 | 低 | FR-008 | T-001 |
| 3 | T-003 | 新建 AgreementService 模块 | P1 | 高 | FR-003, FR-004, FR-006, FR-007 | T-002 |
| 4 | T-004 | 改造 home.tsx 门控逻辑 | P1 | 中 | FR-001, FR-003 | T-003 |
| 5 | T-005 | 改造 deveco-onboarding.tsx Privacy 步骤 | P1 | 高 | FR-002, FR-005, FR-006, FR-008, FR-009 | T-003 |
| 6 | T-006 | 验证与集成测试 | P1 | 中 | 全 FR | T-004, T-005 |

---

## 任务详细说明

### T-001: 扩展 deveco-legal.ts 常量配置

**目标**: 将协议 ID、TMS URL、用户协议链接等硬编码值提取为常量，为后续模块提供统一的配置入口。

**修改文件**: `packages/opencode/src/cli/deveco-legal.ts`

**具体操作**:

1. 新增常量 `DEVECO_AI_TERMS_URL` — 用户协议链接
2. 新增常量 `DEVECO_PRIVACY_ID` — 隐私协议 ID `"10669"`
3. 新增常量 `DEVECO_TERMS_ID` — 用户协议 ID `"30000092"`
4. 新增常量 `DEVECO_TMS_URL` — TMS 协议服务 URL

**验收标准**:
- 4 个新常量已定义且值正确
- 现有 `DEVECO_AI_PRIVACY_URL` 和 `KV_DEVECO_CODE_PRIVACY_ACCEPTED` 不变
- 无编译错误

**需求覆盖**: FR-003 (协议查询需协议 ID 和 URL), FR-005 (签署页面需协议链接)

---

### T-002: 扩展 DevEcoAuth.getUserId 方法

**目标**: 为 AgreementService 提供获取 userId 的能力，用于签署成功后更新本地缓存。

**修改文件**: `packages/opencode/src/plugin/deveco.ts`

**具体操作**:

1. 在 `DevEcoAuth` 类中新增 `getUserId(): Promise<string | null>` 方法
2. 优先从 `loginService.getUserInfo()` 获取 userId
3. 若 userInfo 为空，则从 tokenStorage 加载 jwtToken 并解析 userId
4. 解析失败返回 null

**验收标准**:
- 已登录用户调用 getUserId 返回正确 userId
- 未登录用户调用 getUserId 返回 null
- jwtToken 解析异常时返回 null（不抛出错误）
- 无编译错误

**需求覆盖**: FR-008 (签署成功后更新本地缓存需 userId)

**依赖**: T-001 (不直接依赖，但同属基础设施层)

---

### T-003: 新建 AgreementService 模块

**目标**: 创建 TMS 协议查询和签署的核心服务模块，包含 session 超时重试逻辑、版本比对逻辑、降级策略。

**新建文件**: `packages/opencode/src/cli/deveco-agreement.ts`

**具体操作**:

1. 定义数据模型接口:
   - `AgreementStatus` 枚举 (COMPLIANT, NEED_SIGN, NEED_RE_SIGN, NETWORK_ERROR)
   - `AgreementQueryResult` 接口
   - `AgreementSignResult` 接口
   - `AgreementCheckResult` 接口
   - `SignInfo`, `VersionInfo` 接口

2. 实现 `queryAgreement(accessToken, agrId)`:
   - 构造 POST 请求参数（nsp_svc=as.user.query, access_token, request JSON）
   - 调用 TMS API（使用现有 HttpClient 模式，参考 deveco.ts 中的 HttpClient 类）
   - 解析响应 JSON
   - 检测 SESSION_TIMEOUT / INVALID_SESSION → 触发重试逻辑
   - 判断 signInfo 为空 → 返回 NEED_SIGN
   - 判断 isAgree=false → 返回 NEED_SIGN
   - 比对 signedVersion vs newestVersion → 返回 COMPLIANT / NEED_RE_SIGN
   - 网络异常 → 返回 NETWORK_ERROR

3. 实现 `signAgreement(accessToken, isRetry)`:
   - 构造 POST 请求参数（nsp_svc=as.user.sign, access_token, request JSON 含两个 signInfo）
   - 调用 TMS API
   - 检测 SESSION_TIMEOUT / INVALID_SESSION → 触发重试逻辑
   - errorCode=0 → 返回 isUpload=true
   - 否则 → 返回 isUpload=false
   - 网络异常 → 返回失败

4. 实现 session 超时重试逻辑 `callWithRetry(apiCallFn)`:
   - 检测 SESSION_TIMEOUT / INVALID_SESSION
   - 调用 `devecoAuth.refreshToken()` 刷新 token
   - 刷新成功 → 使用新 accessToken 重试原 API
   - 刷新失败 → 不重试，返回失败

5. 实现 `checkAllAgreements(accessToken, kvStore)`:
   - 分别查询 PRIVACY_ID 和 TERMS_ID 的签署状态
   - 两个均 COMPLIANT → canEnter=true
   - 任一不合规 → canEnter=false
   - 两个均为 NETWORK_ERROR → 检查本地 KV 缓存降级策略
   - 本地 KV 有记录 → canEnter=true（降级）
   - 本地 KV 无记录 → canEnter=false, 提示网络错误

6. 实现 `compareAgreementVersion(newest, signed)`: 返回 signed >= newest

7. 导出 AgreementService 实例和所有接口类型

**验收标准**:
- queryAgreement 正确构造请求参数，与 Java 参考代码格式一致
- signAgreement 正确构造包含两个 signInfo 的请求参数
- SESSION_TIMEOUT / INVALID_SESSION 检测和重试逻辑正确
- 版本比对逻辑：signed >= newest 返回 true
- 降级策略：NETWORK_ERROR 时正确读取 KV 缓存判断
- 网络异常被捕获，返回 NETWORK_ERROR 而非抛出错误
- 无编译错误

**需求覆盖**: FR-003 (查询), FR-004 (版本比对), FR-006 (签署), FR-007 (超时重试), FR-008 (缓存更新)

**依赖**: T-002 (需要 DevEcoAuth.refreshToken 和 getUserId)

---

### T-004: 改造 home.tsx 门控逻辑

**目标**: 将 home.tsx 的门控判断从本地 KV 布尔标记改为远程 API 查询，支持降级策略。

**修改文件**: `packages/opencode/src/cli/cmd/tui/routes/home.tsx`

**具体操作**:

1. 导入 `AgreementService` 和 `devecoAuth`
2. 修改 createEffect 中的门控逻辑:
   - 移除 `kv.get(KV_DEVECO_CODE_PRIVACY_ACCEPTED, false)` 直接判断
   - 新增：获取 accessToken（从 devecoAuth.getSession()）
   - 无 accessToken → setDevecoReady(false)（显示 onboarding）
   - 有 accessToken → 调用 AgreementService.checkAllAgreements(accessToken, kv)
   - canEnter=true 且 hasCredentials → setDevecoReady(true)
   - canEnter=false → setDevecoReady(false)
3. 处理异步调用：在 effect 中使用 async 回调或 createEffect + onMount 模式

**验收标准**:
- 已签署合规用户 → 直接进入对话页面（无需 onboarding）
- 未登录用户 → 显示 onboarding
- API 不可达 + 有本地缓存 → 降级允许进入
- API 不可达 + 无本地缓存 → 显示 onboarding
- 不影响 hasCredentials 逻辑（provider 检查不变）
- 无编译错误

**需求覆盖**: FR-001 (登录检查), FR-003 (协议查询)

**依赖**: T-003 (AgreementService)

---

### T-005: 改造 deveco-onboarding.tsx Privacy 步骤

**目标**: 将 privacy 步骤从"本地 KV 勾选同意"改为"远程查询+签署"，包含确认框、两个协议链接、签署 API 调用、错误处理。

**修改文件**: `packages/opencode/src/cli/cmd/tui/component/deveco-onboarding.tsx`

**具体操作**:

1. 导入 AgreementService、新增常量 (DEVECO_AI_TERMS_URL, DEVECO_PRIVACY_ID, DEVECO_TERMS_ID 等)

2. 新增信号:
   - `agreementStatus` (AgreementCheckResult | null) — 协议查询结果
   - `checkboxChecked` (boolean) — 确认框勾选状态
   - `signBusy` (boolean) — 签署进行中标记
   - `signError` (string | null) — 签署错误信息
   - `checkingStatus` (boolean) — 正在查询协议状态标记

3. 修改初始化逻辑:
   - 移除 `privacyOk()` 直接 KV 判断
   - 初始 step 统一设为 "privacy"
   - 进入 privacy 步骤后异步调用 checkAllAgreements

4. 修改 privacy 步骤键盘处理:
   - `Space` → 勾选/取消确认框 `setCheckboxChecked(!checkboxChecked())`
   - `Up/Down` → 切换 Agree/Cancel 选项索引
   - `Enter` →
     - 若选中 Agree 且 checkboxChecked=true → 触发签署流程
     - 若选中 Agree 但 checkboxChecked=false → 不响应（Agree 不可用）
     - 若选中 Cancel → exit()
   - `Ctrl+C` → exit()

5. 修改 privacy 步骤 UI:
   - 加载状态: checkingStatus=true 时显示 "Checking agreement status..."
   - 签署页面:
     - 描述文本："Please read and agree to the following agreements..."
     - 用户协议链接 (Link href=DEVECO_AI_TERMS_URL)
     - 隐私协议链接 (Link href=DEVECO_AI_PRIVACY_URL)
     - 确认框文本: checkboxChecked ? "☑ I have read and agree..." : "☐ I have read and agree..."
     - 提示: "(Press Space to check)"
     - Agree 选项 (checkboxChecked ? 可选 : 显示为灰色/muted)
     - Cancel 选项
     - 签署中状态: signBusy=true 时显示 "Signing agreement..."
     - 错误信息: signError 显示红色错误文本
   - 网络错误无缓存: 显示 "Network error: Cannot reach agreement service" + Cancel 选项

6. 实现签署流程 `runSignAgreement()`:
   - 获取 accessToken (从 devecoAuth.getSession() 或 kv 缓存的 session 信息)
   - 调用 AgreementService.signAgreement(accessToken, false)
   - 成功 →
     - 更新 KV 缓存: `kv.set(KV_DEVECO_CODE_PRIVACY_ACCEPTED, true)`
     - KV 写入失败 → 仅 log.error，不阻断
     - setStep('entry')
   - 失败 → setSignError("Failed to sign agreement. Please try again."), setSignBusy(false)
   - session 超时 → AgreementService 内部处理重试（FR-007 已封装在 T-003）

7. 实现协议状态检查 `checkAgreementStatus()`:
   - 获取 accessToken
   - 无 accessToken → 直接显示签署页面（但签署时需先登录，通过 entry 步骤引导）
   - 有 accessToken → 调用 AgreementService.checkAllAgreements(accessToken, kv)
   - COMPLIANT → setStep('entry')
   - NETWORK_ERROR + hasLocalCache → setStep('entry')（降级）
   - NETWORK_ERROR + !hasLocalCache → 显示网络错误页面
   - NEED_SIGN / NEED_RE_SIGN → 显示签署页面

**验收标准**:
- Privacy 步骤正确显示两个协议链接
- 空格键可勾选/取消确认框
- 未勾选时 Agree 选项不可用（视觉区分：muted 颜色）
- 勾选后 Agree 可用，回车触发签署
- 签署成功后跳到 entry 步骤
- 签署失败显示错误信息，可重试
- Cancel → exit() 退出 CLI
- 网络错误无缓存时显示错误提示 + Cancel
- 已签署合规用户自动跳过 privacy 步骤
- 加载状态显示 "Checking agreement status..."
- 无编译错误

**需求覆盖**: FR-002 (登录引导), FR-005 (签署页面), FR-006 (远程签署), FR-008 (缓存更新), FR-009 (拒绝退出)

**依赖**: T-003 (AgreementService)

---

### T-006: 验证与集成测试

**目标**: 验证完整流程的端到端集成，确保各模块协同工作。

**具体操作**:

1. 编译验证: 运行项目构建，确认无编译错误
2. 场景验证（需模拟器或真机 + 华为账号）:
   - 新用户完整流程: 打开 CLI → 登录 → 签署 → 进入对话
   - 已签署合规用户: 打开 CLI → 自动跳过 → 进入对话
   - 协议版本过期: 打开 CLI → 显示签署页面 → 重新签署 → 进入对话
   - 用户取消: 签署页面 Cancel → CLI 退出
   - 网络异常降级: 断网测试 → 有缓存允许进入 / 无缓存阻断

3. 边界验证:
   - KV 缓存写入失败场景（签署成功但 KV set 异常）
   - Session 超时自动重试（需实际触发或 mock）
   - 两个协议状态不一致（隐私合规但用户协议不合规）

**验收标准**:
- 项目构建成功
- 所有 9 个 FR 的验收标准均满足
- 无运行时崩溃或异常

**需求覆盖**: 全 FR (FR-001 ~ FR-009)

**依赖**: T-004, T-005

---

## 任务依赖关系图

```
T-001 (deveco-legal.ts 常量)
    ↓
T-002 (DevEcoAuth.getUserId)
    ↓
T-003 (AgreementService 核心) ←── T-001, T-002
    ↓                    ↓
T-004 (home.tsx 门控)   T-005 (onboarding Privacy 步骤)
    ↓                    ↓
    └────────────────────┘
           ↓
      T-006 (验证与集成)
```

---

## 实施策略

1. **顺序执行**: 按 T-001 → T-002 → T-003 → T-004/T-005(可并行) → T-006 执行
2. **独立验证**: 每完成一个任务后运行构建验证，确保无编译错误再继续
3. **最小变更**: 每个任务仅修改/新建指定的文件，不扩大变更范围
4. **保留回滚**: 每个任务完成后可独立回滚，不影响其他任务

---

## 附录

### A. 变更历史

| 版本 | 日期 | 作者 | 变更描述 |
|------|------|------|----------|
| 1.0 | 2026-05-21 | DevEco Code | 初始版本 |
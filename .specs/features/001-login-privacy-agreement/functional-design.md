# 功能设计说明书: 用户登录与隐私协议签署流程

**功能分支**: `001-login-privacy-agreement`
**创建日期**: 2026-05-21
**状态**: 草稿
**输入**: `.specs/features/001-login-privacy-agreement/requirements-analysis.md` (v1.0.1)

---

## 1. 概述

### 1.1 设计目标

将 DevEco Code CLI 的隐私协议检查从"本地 KV 布尔标记判断"改为"华为 TMS 远程 API 查询+签署"，确保用户在使用 AI 对话功能前已完成最新版本隐私协议和用户协议的远程签署，满足合规要求。

### 1.2 设计原则

| 原则 | 说明 |
|------|------|
| 最小侵入 | 仅修改 privacy 步骤逻辑和门控判断，保留现有 onboarding 步骤框架（entry→auth→providers→key）不变 |
| 降级容错 | 远程 API 不可达时，本地 KV 缓存作为降级策略：有记录允许进入，无记录阻断并提示网络错误 |
| 配置化 | 协议 ID、TMS URL、协议链接等硬编码值提取为常量/配置 |
| 单次签署 | 签署页面统一展示两个协议链接，用户一次同意即同时签署两个协议 |

---

## 2. 系统架构设计

### 2.1 模块架构

```
┌──────────────────────────────────────────────────┐
│                 DevEco Code CLI                    │
│                                                    │
│  ┌──────────────────────┐  ┌─────────────────────┐│
│  │  home.tsx (门控)     │  │  AgreementService   ││
│  │  判断是否进入onboarding│  │  TMS API 封装       ││
│  └──────────────────────┘  └─────────────────────┘│
│           │                          │             │
│           ▼                          ▼             │
│  ┌──────────────────────┐  ┌─────────────────────┐│
│  │ deveco-onboarding.tsx│  │  DevEcoAuth         ││
│  │ privacy 步骤改造      │  │  登录+token刷新     ││
│  └──────────────────────┘  └─────────────────────┘│
│           │                          │             │
│           ▼                          ▼             │
│  ┌──────────────────────┐  ┌─────────────────────┐│
│  │  KV Store (本地缓存) │  │  deveco-legal.ts    ││
│  │  降级策略            │  │  常量配置            ││
│  └──────────────────────┘  └─────────────────────┘│
└──────────────────────────────────────────────────┘
           │                          │
           ▼                          ▼
    ┌──────────────┐      ┌──────────────────────┐
    │  KV Store    │      │  华为 TMS 协议服务     │
    │  (本地持久化) │      │  查询/签署 API        │
    └──────────────┘      └──────────────────────┘
```

### 2.2 新增模块

| 模块 | 文件路径 | 职责 |
|------|----------|------|
| AgreementService | `packages/opencode/src/cli/deveco-agreement.ts` | 封装 TMS 协议查询和签署 API 调用，包含 session 超时重试逻辑 |

### 2.3 修改模块

| 模块 | 文件路径 | 修改范围 |
|------|----------|----------|
| deveco-legal.ts | `packages/opencode/src/cli/deveco-legal.ts` | 新增协议 ID 常量、TMS URL、用户协议链接 |
| deveco-onboarding.tsx | `packages/opencode/src/cli/cmd/tui/component/deveco-onboarding.tsx` | privacy 步骤从本地 KV 判断改为远程查询+签署 |
| home.tsx | `packages/opencode/src/cli/cmd/tui/routes/home.tsx` | 门控逻辑改为调用 AgreementService 远程查询 |
| deveco.ts | `packages/opencode/src/plugin/deveco.ts` | 新增 getUserId 方法供 AgreementService 使用 |

### 2.4 不修改模块

| 模块 | 说明 |
|------|------|
| entry 步骤 | 保持现有"Login through a browser / Other providers"选择不变 |
| auth 步骤 | 保持现有浏览器 OAuth 登录流程不变 |
| providers 步骤 | 保持现有 provider 选择流程不变 |
| key 步骤 | 保持现有 API Key 输入流程不变 |

---

## 3. 数据模型设计

### 3.1 协议查询请求参数

```typescript
interface AgreementQueryParam {
  nsp_svc: "as.user.query"
  access_token: string
  request: string  // JSON字符串，格式如下
}

// request 字段的内部结构
interface AgreementQueryRequest {
  obtainVersion: true
  agrInfo: [{
    agrType: string    // 协议ID："10669" 或 "30000092"
    country: "CN"
    signType: 0
    branchId: 0
  }]
}
```

### 3.2 协议查询响应结构

```typescript
interface AgreementQueryResponse {
  errorCode?: number       // 0 表示成功
  error?: string           // "SESSION_TIMEOUT" | "INVALID_SESSION" | 其他错误
  signInfo?: SignInfo[]    // 签署信息数组
  versionInfo?: VersionInfo[]  // 版本信息数组
}

interface SignInfo {
  isAgree: boolean         // 是否同意
  version: number          // 已签署版本号
  agrType: string          // 协议ID
}

interface VersionInfo {
  newestVersion: number    // 最新版本号
  agrType: string          // 协议ID
}
```

### 3.3 协议签署请求参数

```typescript
interface AgreementSignParam {
  nsp_svc: "as.user.sign"
  access_token: string
  request: string  // JSON字符串，格式如下
}

// request 字段的内部结构
interface AgreementSignRequest {
  signInfo: [{
    agrType: string      // 协议ID
    country: "CN"
    language: "zh_CN"
    isAgree: true
  }, {
    agrType: string      // 第二个协议ID
    country: "CN"
    language: "zh_CN"
    isAgree: true
  }]
}
```

### 3.4 协议签署响应结构

```typescript
interface AgreementSignResponse {
  errorCode?: number       // 0 表示成功
  error?: string           // "SESSION_TIMEOUT" | "INVALID_SESSION" | 其他错误
}
```

### 3.5 协议合规状态枚举

```typescript
enum AgreementStatus {
  COMPLIANT = "compliant",         // 已签署且版本合规
  NEED_SIGN = "need_sign",         // 需要签署（未签署）
  NEED_RE_SIGN = "need_re_sign",   // 需要重新签署（版本过期）
  NETWORK_ERROR = "network_error", // 远程API不可达
}
```

### 3.6 协议检查结果

```typescript
interface AgreementCheckResult {
  privacyStatus: AgreementStatus   // 隐私协议状态
  termsStatus: AgreementStatus     // 用户协议状态
  overallStatus: AgreementStatus   // 综合状态（任一不合规即不合规）
  canEnter: boolean                // 是否允许进入对话页面
  hasLocalCache: boolean           // 是否有本地KV缓存记录（用于降级判断）
}
```

---

## 4. 功能模块详细设计

### 4.1 AgreementService — TMS 协议服务封装

**文件**: `packages/opencode/src/cli/deveco-agreement.ts`

#### 4.1.1 查询协议签署状态

```
queryAgreementStatus(accessToken: string, agrId: string): Promise<AgreementQueryResult>
```

| 步骤 | 描述 |
|------|------|
| 1 | 构造 POST 请求参数（nsp_svc=as.user.query, access_token, request JSON） |
| 2 | 调用 TMS API（https://terms-drcn.platform.dbankcloud.cn/agreementservice/user） |
| 3 | 解析响应 JSON |
| 4 | 若响应含 error=SESSION_TIMEOUT 或 INVALID_SESSION → 触发 FR-007 重试逻辑 |
| 5 | 若 errorCode=0 → 解析 signInfo 和 versionInfo，执行版本比对（FR-004） |
| 6 | 若 signInfo 为空或 isAgree=false → 返回 NEED_SIGN |
| 7 | 若 signedVersion < newestVersion → 返回 NEED_RE_SIGN |
| 8 | 若 signedVersion >= newestVersion → 返回 COMPLIANT |
| 9 | 若网络异常 → 返回 NETWORK_ERROR |

#### 4.1.2 签署协议

```
signAgreement(accessToken: string, isRetry: boolean): Promise<AgreementSignResult>
```

| 步骤 | 描述 |
|------|------|
| 1 | 构造 POST 请求参数（nsp_svc=as.user.sign, access_token, request JSON 含两个 signInfo） |
| 2 | 调用 TMS API |
| 3 | 若响应含 error=SESSION_TIMEOUT 或 INVALID_SESSION → 触发 FR-007 重试逻辑 |
| 4 | 若 errorCode=0 → 签署成功，返回 isUpload=true |
| 5 | 否则 → 签署失败，返回 isUpload=false |
| 6 | 网络异常 → 返回失败 |

#### 4.1.3 Session 超时重试逻辑（FR-007）

```
handleSessionTimeout<T>(apiCall: () => Promise<T>): Promise<T>
```

| 步骤 | 描述 |
|------|------|
| 1 | 检测到 SESSION_TIMEOUT / INVALID_SESSION 错误 |
| 2 | 调用 DevEcoAuth.refreshToken() 刷新 token |
| 3 | 若刷新成功 → 使用新 accessToken 重试原 API 调用 |
| 4 | 若刷新失败（getLoginFlag=false）→ 不重试，返回失败 |

#### 4.1.4 综合协议检查

```
checkAllAgreements(accessToken: string): Promise<AgreementCheckResult>
```

| 步骤 | 描述 |
|------|------|
| 1 | 分别查询 PRIVACY_ID=10669 和 TERMS_ID=30000092 的签署状态 |
| 2 | 两个协议均 COMPLIANT → overallStatus=COMPLIANT, canEnter=true |
| 3 | 任一协议 NEED_SIGN/NEED_RE_SIGN → overallStatus 取较差状态, canEnter=false |
| 4 | 两个均为 NETWORK_ERROR → 检查本地 KV 缓存（降级策略） |
| 5 | 本地 KV 有记录 → canEnter=true（降级允许进入） |
| 6 | 本地 KV 无记录 → canEnter=false, 提示网络错误 |

#### 4.1.5 版本比对逻辑（FR-004）

```
compareAgreementVersion(newestVersion: number, signedVersion: number): boolean
```

- 返回 `signedVersion >= newestVersion`
- 严格参照 Java 参考代码的实现

---

### 4.2 deveco-legal.ts — 常量配置扩展

**文件**: `packages/opencode/src/cli/deveco-legal.ts`

新增以下常量：

| 常量名 | 值 | 说明 |
|--------|-----|------|
| `DEVECO_AI_TERMS_URL` | `https://legal.cloud.huawei.com/terms/scope/huawei/deveco-studio/ai-terms.htm?code=CN&language=zh-CN&branchid=0&contenttag=default` | 用户协议链接 |
| `DEVECO_PRIVACY_ID` | `"10669"` | 隐私协议 ID |
| `DEVECO_TERMS_ID` | `"30000092"` | 用户协议 ID |
| `DEVECO_TMS_URL` | `"https://terms-drcn.platform.dbankcloud.cn/agreementservice/user"` | TMS 协议服务 URL |

保留现有常量：

| 常量名 | 说明 |
|--------|------|
| `DEVECO_AI_PRIVACY_URL` | 隐私协议链接（不变） |
| `KV_DEVECO_CODE_PRIVACY_ACCEPTED` | 本地 KV key（语义变更为"远程签署成功后本地缓存"） |

---

### 4.3 deveco-onboarding.tsx — Privacy 步骤改造

**文件**: `packages/opencode/src/cli/cmd/tui/component/deveco-onboarding.tsx`

#### 4.3.1 变更概述

| 项目 | 原实现 | 新实现 |
|------|--------|--------|
| privacy 步骤判断 | `kv.get(KV_DEVECO_CODE_PRIVACY_ACCEPTED, false)` → true 则跳到 entry | 远程查询 TMS API，两个协议均合规才跳到 entry |
| privacy 步骤页面 | 显示隐私协议链接 + "I agree" / "No, exit" | 显示两个协议链接（隐私+用户协议） + 确认框 + Agree/Cancel |
| privacy 步骤交互 | 上下键选择，回车确认 | 空格勾选确认框，勾选后 Agree 可用，回车触发签署 |
| Agree 后动作 | `kv.set(KV_DEVECO_CODE_PRIVACY_ACCEPTED, true)` → 跳到 entry | 调用 TMS 签署 API → 成功后更新 KV + 跳到 entry；失败提示错误 |
| Cancel 后动作 | 调用 exit() 退出 CLI | 调用 exit() 退出 CLI（不变） |

#### 4.3.2 新增信号

```typescript
const [agreementStatus, setAgreementStatus] = createSignal<AgreementCheckResult | null>(null)
const [checkboxChecked, setCheckboxChecked] = createSignal(false)
const [signBusy, setSignBusy] = createSignal(false)
const [signError, setSignError] = createSignal<string | null>(null)
```

#### 4.3.3 Privacy 步骤流程

```
进入 privacy 步骤
    ↓
异步调用 AgreementService.checkAllAgreements(accessToken)
    ↓
├─ overallStatus = COMPLIANT → 跳到 entry 步骤（已签署合规）
├─ overallStatus = NETWORK_ERROR 且 hasLocalCache = true → 跳到 entry 步骤（降级策略）
├─ overallStatus = NETWORK_ERROR 且 hasLocalCache = false → 显示"网络错误"提示，阻断进入
├─ overallStatus = NEED_SIGN / NEED_RE_SIGN → 显示签署页面
│
│  显示签署页面:
│  ├─ 用户协议链接 + 隐私协议链接
│  ├─ 确认框（空格勾选）
│  ├─ Agree 按钮（勾选后可用）
│  ├─ Cancel 按钮
│  │
│  ├─ Agree → 调用 AgreementService.signAgreement(accessToken, false)
│  │          ├─ 成功 → 更新 KV 缓存 + 跳到 entry 步骤
│  │          ├─ 失败 → 显示错误信息，用户可重试
│  │          └─ 缓存写入失败 → 仅记录日志，不阻断（仍跳到 entry）
│  │
│  └─ Cancel → exit() 退出 CLI
```

#### 4.3.4 Privacy 步骤 UI 布局

```
┌─────────────────────────────────────────────────────────┐
│  Please read and agree to the following agreements to   │
│  start the HarmonyOS development journey.               │
│                                                         │
│  📄 User Agreement:  [link]                             │
│  📄 Privacy Policy:  [link]                             │
│                                                         │
│  ☐ I have read and agree to the above agreements       │
│     (Press Space to check)                              │
│                                                         │
│  ● 1. Agree                                             │
│    2. Cancel                                             │
│                                                         │
│  [Use Enter to Select, Space to Check]                  │
│                                                         │
│  [错误信息区域 - 仅签署失败时显示]                         │
└─────────────────────────────────────────────────────────┘
```

#### 4.3.5 键盘交互设计

| 按键 | 作用 |
|------|------|
| `Space` | 勾选/取消确认框 |
| `Up/Down` | 在 Agree/Cancel 选项间切换 |
| `Enter` | 执行当前选项（Agree 需勾选确认框才可用） |
| `Ctrl+C` | 退出 CLI |

#### 4.3.6 初始化逻辑变更

```typescript
// 原实现
const privacyOk = () => kv.get(KV_DEVECO_CODE_PRIVACY_ACCEPTED, false) === true;
const [step, setStep] = createSignal<OnboardingStep>(privacyOk() ? "entry" : "privacy")

// 新实现
const [step, setStep] = createSignal<OnboardingStep>("privacy")
// 进入 privacy 步骤后异步调用 AgreementService.checkAllAgreements()
// 根据结果决定跳转
```

**关键变更**: 初始化不再直接从 KV 判断跳过 privacy 步骤，而是统一进入 privacy 步骤后通过远程查询决定跳转。这确保每次启动都执行远程查询，避免本地缓存与远程状态不一致。

---

### 4.4 home.tsx — 门控逻辑改造

**文件**: `packages/opencode/src/cli/cmd/tui/routes/home.tsx`

#### 4.4.1 变更概述

| 项目 | 原实现 | 新实现 |
|------|--------|--------|
| 门控判断 | `kv.get(KV_DEVECO_CODE_PRIVACY_ACCEPTED, false)` | `AgreementService.checkAllAgreements(accessToken)` |
| 隐私不合规 | `setDevecoReady(false)` → 显示 onboarding | `setDevecoReady(false)` → 显示 onboarding（不变） |
| 隐私合规 | `setDevecoReady(true)` → 进入对话 | `setDevecoReady(true)` → 进入对话（不变） |
| API 不可达有缓存 | 不存在此场景 | 降级允许进入 → `setDevecoReady(true)` |
| API 不可达无缓存 | 不存在此场景 | 阻断进入 → `setDevecoReady(false)` |

#### 4.4.2 变更代码

```typescript
// 原实现
const privacyAccepted = kv.get(KV_DEVECO_CODE_PRIVACY_ACCEPTED, false)
const hasCredentials = sync.data.provider.some(...)
if (!privacyAccepted || !hasCredentials) {
  setDevecoReady(false)
} else {
  setDevecoReady(true)
}

// 新实现
const hasCredentials = sync.data.provider.some(...)

// 获取 accessToken
const session = await devecoAuth.getSession()
const accessToken = session?.accessToken || ""

if (!accessToken) {
  // 未登录 → 显示 onboarding（entry 步骤会引导登录）
  if (!hasCredentials) {
    setDevecoReady(false)
  } else {
    setDevecoReady(false)  // 需要登录才能查询协议
  }
  return
}

// 远程查询协议签署状态
const checkResult = await AgreementService.checkAllAgreements(accessToken)

if (checkResult.canEnter && hasCredentials) {
  setDevecoReady(true)
} else {
  setDevecoReady(false)
}
```

---

### 4.5 deveco.ts — getUserId 扩展

**文件**: `packages/opencode/src/plugin/deveco.ts`

新增 getUserId 方法供 AgreementService 使用（签署成功后更新本地缓存时需要 userId）：

```typescript
// DevEcoAuth 类新增方法
async getUserId(): Promise<string | null> {
  const userInfo = this.getUserInfo()
  if (userInfo?.userId) return userInfo.userId
  const jwtToken = await tokenStorage.loadToken()
  if (!jwtToken) return null
  try {
    const parsed = loginService.parseJwt(jwtToken)
    return parsed.userId || null
  } catch {
    return null
  }
}
```

---

## 5. 流程设计

### 5.1 主流程

```
用户打开 CLI
    ↓
home.tsx 门控检查
    ↓
├─ 有 accessToken → 远程查询协议签署状态
│   ├─ 两个协议均 COMPLIANT → 直接进入对话页面
│   ├─ 任一不合规 → 显示 onboarding（privacy 步骤）
│   └─ API 不可达 → 降级策略判断
│       ├─ 有本地 KV 缓存 → 允许进入对话页面
│       └─ 无本地 KV 缓存 → 显示 onboarding（privacy 步骤提示网络错误）
│
└─ 无 accessToken → 显示 onboarding（从 entry 步骤开始）
```

### 5.2 Privacy 步骤详细流程

```
进入 privacy 步骤
    ↓
异步查询协议签署状态（AgreementService.checkAllAgreements）
    ↓
显示加载状态 "Checking agreement status..."
    ↓
├─ COMPLIANT → setStep('entry')
├─ NEED_SIGN / NEED_RE_SIGN → 显示签署页面
│   │
│   │  签署页面交互:
│   │  ├─ 显示两个协议链接
│   │  ├─ 确认框（空格勾选）
│   │  ├─ Agree/Cancel 选项
│   │  │
│   │  ├─ Agree → setSignBusy(true)
│   │  │         → AgreementService.signAgreement(accessToken, false)
│   │  │         ├─ 成功 → 更新 KV 缓存
│   │  │         │        ├─ KV 写入成功 → setStep('entry')
│   │  │         │        └─ KV 写入失败 → log.error + setStep('entry')
│   │  │         ├─ 失败 → setSignError("签署失败，请重试")
│   │  │         │        → setSignBusy(false)
│   │  │         │        → 用户可再次尝试 Agree
│   │  │         └─ session 超时 → 自动刷新 token 重试（FR-007）
│   │  │
│   │  └─ Cancel → exit()
│
├─ NETWORK_ERROR + hasLocalCache → setStep('entry')（降级策略）
├─ NETWORK_ERROR + !hasLocalCache → 显示 "网络错误：无法连接协议服务"
│                               → 显示 Cancel 选项 → exit()
```

### 5.3 Session 超时重试流程（FR-007）

```
API 调用返回 SESSION_TIMEOUT / INVALID_SESSION
    ↓
调用 DevEcoAuth.refreshToken()
    ↓
├─ 刷新成功 → 使用新 accessToken 重试原 API
│   ├─ 重试成功 → 正常返回结果
│   └─ 重试失败 → 返回失败
│
└─ 刷新失败 → 不重试，返回失败
```

---

## 6. API 接口设计

### 6.1 AgreementService 公开接口

| 方法 | 签名 | 返回类型 | 说明 |
|------|------|----------|------|
| queryAgreement | `queryAgreement(accessToken: string, agrId: string): Promise<AgreementQueryResult>` | `AgreementQueryResult` | 查询单个协议签署状态 |
| signAgreement | `signAgreement(accessToken: string, isRetry: boolean): Promise<AgreementSignResult>` | `AgreementSignResult` | 签署两个协议 |
| checkAllAgreements | `checkAllAgreements(accessToken: string): Promise<AgreementCheckResult>` | `AgreementCheckResult` | 综合检查两个协议状态 |

### 6.2 AgreementQueryResult

```typescript
interface AgreementQueryResult {
  status: AgreementStatus       // 协议状态
  signInfo: SignInfo | null     // 签署信息（可能为空）
  versionInfo: VersionInfo | null  // 版本信息
  error?: string               // 错误信息（如有）
}
```

### 6.3 AgreementSignResult

```typescript
interface AgreementSignResult {
  success: boolean             // 签署是否成功
  isUpload: boolean            // 是否成功上传（对应 Java 代码的 isUpload）
  error?: string               // 错误信息
  refreshedToken?: boolean     // 是否发生了 token 刷新重试
}
```

---

## 7. 错误处理设计

### 7.1 错误分类与处理策略

| 错误类型 | 场景 | 处理策略 |
|----------|------|----------|
| SESSION_TIMEOUT | 查询/签署 API 返回 session 超时 | 自动刷新 token 重试一次（FR-007） |
| INVALID_SESSION | 查询/签署 API 返回无效 session | 同 SESSION_TIMEOUT 处理 |
| 网络不可达 | TMS API 完全无法连接 | 降级策略：有本地缓存允许进入，无缓存阻断 |
| 签署失败 | 签署 API 返回 errorCode≠0 | 提示错误信息，用户可重试 |
| Token 刷新失败 | refreshToken 返回 null 或 getLoginFlag=false | 不重试，返回失败，用户需重新登录 |
| KV 缓存写入失败 | 签署成功后 KV 写入异常 | 仅记录日志，不阻断用户进入对话页面 |
| 协议版本解析失败 | 响应 JSON 中缺少 versionInfo/signInfo | 视为需要签署 |

### 7.2 本地缓存降级策略

```
远程 API 不可达时的判断逻辑:
    ↓
读取 KV: kv.get(KV_DEVECO_CODE_PRIVACY_ACCEPTED, false)
    ↓
├─ true → 允许进入对话页面（信任本地缓存）
└─ false/undefined → 阻断进入，提示网络错误信息
```

---

## 8. 本地缓存设计

### 8.1 KV Key 语义变更

| KV Key | 原语义 | 新语义 |
|--------|--------|--------|
| `deveco_code_privacy_accepted` | 用户在 TUI 勾选同意（本地标记） | 远程签署成功后的本地缓存标记（降级依据） |

### 8.2 缓存更新规则（FR-008）

| 场景 | 是否更新缓存 | 说明 |
|------|--------------|------|
| 签署成功（isUpload=true） | 是 → `kv.set(KV_DEVECO_CODE_PRIVACY_ACCEPTED, true)` | 必须更新 |
| 首次失败未重试 | 否 | 缓存不变 |
| 重试失败 | 否 | 缓存不变 |
| 签署成功但 KV 写入失败 | 尝试写入，失败仅记录日志 | 不阻断用户 |
| 用户取消签署 | 否 | 不修改任何本地状态 |

---

## 9. 测试设计要点

### 9.1 关键测试场景

| 场景 | 验证要点 |
|------|----------|
| 新用户首次使用 | 完整流程：登录→签署→进入对话 |
| 已签署合规用户 | 远程查询返回 COMPLIANT → 直接进入 |
| 协议版本过期 | 查询返回 NEED_RE_SIGN → 显示签署页面 |
| Session 超时 | 查询/签署时 SESSION_TIMEOUT → 自动刷新 token 重试 |
| Token 刷新失败 | 刷新失败 → 不重试，返回失败 |
| 网络不可达+有本地缓存 | 降级策略 → 允许进入 |
| 网络不可达+无本地缓存 | 阻断进入，提示网络错误 |
| 签署失败 | 显示错误信息，用户可重试 |
| 用户取消签署 | CLI 退出，不修改本地状态 |
| KV 缓存写入失败 | 仅记录日志，仍允许进入 |

---

## 10. 实现依赖关系

```
deveco-legal.ts (常量扩展)
    ↓
deveco.ts (getUserId 扩展)
    ↓
deveco-agreement.ts (新建 AgreementService)
    ↓
home.tsx (门控逻辑改造)
    ↓
deveco-onboarding.tsx (Privacy 步骤改造)
```

建议按此顺序逐步实现，每完成一个模块可独立验证。

---

## 附录

### A. Java 参考代码关键逻辑映射

| Java 代码逻辑 | TypeScript 实现 | 说明 |
|---------------|-----------------|------|
| `queryAgreementFromRemote(privacyId)` | `AgreementService.queryAgreement(accessToken, agrId)` | 查询单个协议 |
| `signAgreement(isRetry)` | `AgreementService.signAgreement(accessToken, isRetry)` | 签署两个协议 |
| `compareAgreementVersion(newest, signed)` | `compareAgreementVersion(newest, signed)` | 版本比对 |
| `SESSION_TIMEOUT` 检测 | 检查 response.error === "SESSION_TIMEOUT" | 超时检测 |
| `refreshAccessToken()` | `DevEcoAuth.refreshToken()` | Token 刷新 |
| `getLoginFlag()` 检查 | 检查 refreshToken 结果是否为 null | 登录状态检查 |
| `isUpload` 标记 | `AgreementSignResult.isUpload` | 签署成功标记 |
| `setLocalPrivacyAgreement(userId, isUpload)` | `kv.set(KV_DEVECO_CODE_PRIVACY_ACCEPTED, true)` | 本地缓存更新 |

### B. 变更历史

| 版本 | 日期 | 作者 | 变更描述 |
|------|------|------|----------|
| 1.0 | 2026-05-21 | DevEco Code | 初始版本 |
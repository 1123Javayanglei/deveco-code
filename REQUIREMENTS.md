# DevEco Code CLI 用户登录与协议签署流程

## 概述

本文档描述 DevEco Code CLI 的用户登录和隐私协议签署流程。

---

## 用户流程

### 1. 登录检查

当用户打开 DevEco Code CLI 时：

1. 系统查询用户是否已登录华为账号(是否登录deveco)
   - **已登录** → 跳转到步骤 3（隐私协议检查）
   - **未登录** → 跳转到步骤 2（显示登录页面）

### 2. 登录页面

显示登录页面，提供以下选项：

- **登录**：打开登录界面（使用现有登录逻辑），登录成功后跳转到步骤 3
- **不登录**：直接退出 CLI

### 3. 隐私协议检查

系统查询用户是否已签署隐私协议：

- **已签署** → 直接进入对话页面
- **未签署** → 跳转到步骤 4

### 4. 签署隐私协议页面

显示隐私协议页面，包含：

1. **协议文本**：展示用户协议和隐私协议链接
2. **确认框**：用户确认已阅读协议（可用空格选择）
3. **操作按钮**：
   - **Agree**（需用户勾选确认框）→ 进入对话页面
   - **Cancel** → 退出 CLI

---

## 配置信息

### 协议链接

| 协议类型 | URL |
|---------|-----|
| 用户协议 | https://legal.cloud.huawei.com/terms/scope/huawei/deveco-studio/ai-terms.htm?code=CN&language=zh-CN&branchid=0&contenttag=default |
| 隐私协议 | https://legal.cloud.huawei.com/terms/scope/huawei/deveco-studio/ai-privacy-statement.htm?code=CN&language=zh-CN&branchid=0&contenttag=default |

### 协议 ID

| 名称 | ID |
|------|-----|
| 隐私协议 ID | `PRIVACY_ID = "10669"` |
| 用户协议 ID | `TERMS_ID = "30000092"` |

**建议**：将协议 ID 写入配置文件中，便于管理和更新。

---

## API 接口

### 查询用户是否签署协议

**请求信息**：

- **URL**: `https://terms-drcn.platform.dbankcloud.cn/agreementservice/user`
- **Method**: `POST`
- **Body**:
```json
{
  "nsp_svc": "as.user.query",
  "access_token": "动态获取的实际用户accessToken字符串",
  "request": "{\"obtainVersion\":true,\"agrInfo\":[{\"agrType\":\"传入的特定协议ID\",\"country\":\"CN\",\"signType\":0,\"branchId\":0}]}"
}
```

**响应解析逻辑**（参考 Java 代码）：

```java
/**
 * 查询用户云端协议签署状态
 *
 * @param privacyId 协议id
 * @return false:需要签署，true:不需要
 */
private static boolean queryAgreementFromRemote(String privacyId) {
    String url = IdeProperties.getTmsUrl("user.url");
    try {
        JSONObject param = AgreementParam.buildQueryParam(privacyId);
        HttpClient client = HttpClient.getInstance();
        CloseableHttpResponse response = client.doPost(url, null, param, getRequestConfig());
        String result = client.getString(response);
        
        // 最新版本号：versionInfo[0].newestVersion
        // 已签署版本号：signInfo[0].version
        JSONObject resJson = JSONObject.parseObject(result);
        
        if (resJson.containsKey(KEY_ERROR) && SESSION_TIMEOUT.equals(resJson.getString(KEY_ERROR))) {
            log.info("query agreement session timeout, refresh token first");
            TokenManager.getInstance().refreshAccessToken(null, false);
            
            if (!HiAiLoginService.getLoginFlag()) {
                log.warn("refresh login token failed, retry login first");
                return false;
            }
            
            CloseableHttpResponse retryResp = client.doPost(url, null, AgreementParam.buildQueryParam(privacyId),
                    getRequestConfig());
            String retryResult = client.getString(retryResp);
            resJson = JSONObject.parseObject(retryResult);
        }
        
        if (resJson.getIntValue(ERROR_CODE) == 0) {
            JSONArray signArr = resJson.getJSONArray("signInfo");
            if (CollectionUtils.isEmpty(signArr)) {
                log.info("signInfo is empty");
                return false;
            }
            if (!signArr.getJSONObject(0).getBooleanValue("isAgree")) {
                log.info("the user is not agree");
                return false;
            }
            JSONArray versionArr = resJson.getJSONArray("versionInfo");
            Integer newestVersion = versionArr.getJSONObject(0).getInteger("newestVersion");
            Integer signedVersion = signArr.getJSONObject(0).getInteger("version");
            return compareAgreementVersion(newestVersion, signedVersion);
        }
    } catch (IOException | JSONException e) {
        log.warn("query agreement version exception: {}", e.getMessage());
    }
    return false;
}
```

---

### 签署协议

**请求信息**：

- **URL**: `https://terms-drcn.platform.dbankcloud.cn/agreementservice/user`
- **Method**: `POST`
- **Body**:
```json
{
  "nsp_svc": "as.user.sign",
  "access_token": "动态获取的实际用户accessToken字符串",
  "request": "{\"signInfo\":[{\"agrType\":\"PRIVACY_ID_VALUE\",\"country\":\"CN\",\"language\":\"zh_CN\",\"isAgree\":true},{\"agrType\":\"TERMS_ID_VALUE\",\"country\":\"CN\",\"language\":\"zh_CN\",\"isAgree\":true}]}"
}
```

**响应解析逻辑**（参考 Java 代码）：

```java
public static void signAgreement(boolean isRetry) {
    ApplicationManager.getApplication().executeOnPooledThread(() -> {
        String url = IdeProperties.getTmsUrl("user.url");
        boolean isUpload = false;
        
        try {
            JSONObject param = AgreementParam.buildSignParam(PRIVACY_ID, TERMS_ID);
            HttpClient client = HttpClient.getInstance();
            CloseableHttpResponse response = client.doPost(url, null, param, client.getRequestConfig(false, url));
            String result = client.getString(response);
            JSONObject resJson = JSONObject.parseObject(result);
            
            if (resJson.containsKey(KEY_ERROR) && (SESSION_TIMEOUT.equals(resJson.getString(KEY_ERROR))
                    || INVALID_SESSION.equals(resJson.getString(KEY_ERROR)))) {
                log.info("sign agreement session timeout, refresh token first");
                TokenManager.getInstance().refreshAccessToken(null, false);
                CloseableHttpResponse retryResp = client.doPost(url, null, param,
                        client.getRequestConfig(false, url));
                result = client.getString(retryResp);
                resJson = JSONObject.parseObject(result);
            }
            
            if (resJson.getIntValue(ERROR_CODE) == 0) {
                isUpload = true;
                log.info("sign agreement success");
            }
        } catch (IOException | JSONException e) {
            log.warn("sign agreement exception {}", e.getMessage());
        } finally {
            // 当上传成功，都需要更新本地缓存；如果上传失败，则需额外判断是否重试；
            // 重试不修改本地缓存；第一次需设置
            if (isUpload || !isRetry) {
                setLocalPrivacyAgreement(TokenManager.getInstance().getUserId(), isUpload);
            }
        }
    });
}
```

---

## 实现要点

1. **Session 超时处理**：API 调用可能因 session 超时失败（`SESSION_TIMEOUT` 或 `INVALID_SESSION`），需要尝试刷新 token 后重试
2. **本地缓存**：签署成功后需更新本地缓存
3. **版本比对**：查询协议时需比对最新版本号与已签署版本号
4. **重试机制**：首次失败时可重试，重试不修改本地缓存

---

## 流程图

```
用户打开 CLI
    ↓
检查登录状态
    ↓
├─ 未登录 → 显示登录页面
│            ├─ 登录成功 → 检查协议签署
│            └─ 不登录 → 退出 CLI
│
└─ 已登录 → 检查协议签署
                ↓
             ├─ 已签署 → 进入对话页面
             └─ 未签署 → 显示协议签署页面
                            ├─ Agree → 进入对话页面
                            └─ Cancel → 退出 CLI
```
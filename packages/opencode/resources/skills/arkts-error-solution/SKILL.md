---
name: arkts-error-solution
description: "Check and fix ArkTS syntax errors in HarmonyOS projects and automate the build process. Use this skill when you need to compile a project, resolve compilation errors, or generate HAP/App artifacts. It provides a complete workflow including static syntax checks, automated error fixing, and repeated builds until success. It also supports error priority classification (P0/P1/P2), maximum retry control, and automatic build artifact discovery."
license: MIT
---

# HarmonyOS Project Automated Build

## Skill Overview

This skill is dedicated to automated HarmonyOS project builds. It combines static syntax checks, error fixing, and iterative build execution to ensure the project can compile successfully and produce output artifacts.

## Use Cases

- ✅ Compile a HarmonyOS project and generate HAP/App artifacts
- ✅ Fix syntax errors that already exist in the project
- ✅ Run an automated build workflow with reduced manual intervention
- ✅ Support continuous integration and continuous delivery scenarios
- ✅ Build a project for the first time or after an upgrade

## Workflow

### Core Flowchart

```
Start
  │
  ├─→ Step 0: Check MCP tool dependencies
  │     ├─→ MCP tools available → continue
  │     └─→ MCP tools unavailable → prompt installation → stop
  │
  ├─→ Step 1: Scan project source files
  │     └─→ Get the list of all .ets files
  │
  ├─→ Step 2: Run static syntax checks
  │     └─→ mcp_deveco-mcp_check_ets_files
  │
  ├─→ Step 3: Analyze diagnostics
  │     ├─→ Errors found → Step 4: Fix errors
  │     └─→ No errors → Step 5: Build project
  │
  ├─→ Step 4: Fix errors
  │     ├─→ Apply fixes
  │     └─→ Return to Step 2 for re-checking
  │
  ├─→ Step 5: Build project
  │     └─→ mcp_deveco-mcp_build_project
  │
  ├─→ Step 6: Check build result
  │     ├─→ Build failed → analyze errors → Step 4
  │     └─→ Build succeeded → Step 7
  │
  └─→ Step 7: Output build artifacts
       └─→ Done
```

### Detailed Execution Steps

#### 0. Check MCP Tool Dependencies

**⚠️ Important: This skill depends on MCP tools**

Before performing any build action, first confirm that the MCP tools are available.

**Required MCP tools**:
- `mcp_deveco-mcp_check_ets_files` - static syntax checking for ETS files
- `mcp_deveco-mcp_build_project` - project build
- `mcp_deveco-mcp_harmonyos_knowledge_search` - HarmonyOS knowledge lookup (optional)

**How to check**:
```
Try calling mcp_deveco-mcp_check_ets_files or mcp_deveco-mcp_build_project.
If the tool is unavailable, an error message will be returned.
```

**If the MCP tools are not installed**:

```
❌ MCP tools are not installed or not available

This skill requires the DevEco MCP Server to work properly.

📦 Installation options (choose one):

Option 1: Install with npx (recommended)
Add the following configuration to the MCP config file:

{
  "mcpServers": {
    "deveco-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "deveco-mcp-server"
      ],
      "env": {
        "PROJECT_PATH": "${workspaceFolder}",
        "DEVECO_PATH": "path to deveco studio"
      }
    }
  }
}

Note: If installation fails because of a regional npm mirror, add this argument:
"--registry=https://registry.npmjs.org"

Option 2: Download a binary package
1. Visit https://github.com/open-deveco/deveco-toolbox
2. Download the installer for your platform (macOS/Windows)
3. Install it and configure the MCP service

📚 Detailed documentation:
- GitHub: https://github.com/open-deveco/deveco-toolbox
- Feishu guide: https://my.feishu.cn/wiki/open-deveco/deveco-toolbox

💡 After installation is complete, use this skill again.
```

**Continue to the next steps only after the dependency check passes.**

---

#### 1. Project Analysis

First analyze the project structure and configuration.

**Key config files**:
- `build-profile.json5` - project-level build configuration
- `entry/build-profile.json5` - module-level build configuration
- `module.json5` - module configuration
- `oh-package.json5` - dependency configuration

#### 2. Get the Source File List

Use the `Glob` tool to search for ETS files in the project:

```bash
# Search all .ets files
**/*.ets

# Exclude directories
- oh_modules/
- build/
- .preview/
```

#### 3. Run Static Syntax Checks

Call the MCP tool to perform ArkTS static syntax checks:

```
mcp_deveco-mcp_check_ets_files
Parameters: files - list of ETS file paths
```

**Diagnostic types**:

| Error Code | Type | Description | Priority |
|-------|------|------|--------|
| 28007 | Warning | permission warning | P2 |
| 6133 | Warning | unused variable/symbol | P2 |
| 6387 | Information | deprecated API used | P1 |
| addTryCatch | Warning | exception handling needed | P2 |
| addAsyncCatch | Warning | async function needs exception handling | P2 |
| others | Error | syntax error / type error | P0 |

#### 4. Error Fixing Strategy

Apply different strategies based on the error type:

**P0 - Must fix (blocks compilation)**:
- Syntax errors: missing semicolons, unmatched brackets
- Type errors: type mismatch
- Undefined variables or functions
- Import errors

**P1 - Strongly recommended to fix**:
- Deprecated APIs: find replacement APIs and apply migration changes

**P2 - Optional optimization**:
- Unused variables: remove them or prefix with `_`
- Exception handling: add `try-catch`

**Detailed fixing examples**: see [error-fixing-examples.md](references/error-fixing-examples.md)

#### 5. Build the Project

Use the MCP tool to build the project:

```
mcp_deveco-mcp_build_project
Parameters:
  - buildTarget: "hap" or "app"
  - buildMode: "debug" or "release"
  - product: "default" (optional)
  - module: "entry@default" (optional)
```

**Build target selection**:
- `hap` - generate a single HAP package for testing or debugging
- `app` - generate an APP package for release

#### 6. Handle Build Errors

If the build fails, analyze the error message:

**Common build errors**:
1. **Dependency issue**: `Error: Cannot find module '@ohos/xxx'` → install dependencies
2. **Resource issue**: `Error: Resource not found` → check resource files
3. **Signing issue**: `Error: Signing failed` → check signing configuration
4. **Compilation issue**: `Error: ArkTS compiler error` → return to Step 2 for re-checking

#### 7. Output Build Artifacts

After a successful build, the artifacts are typically located at:

```
project-root/
├── entry/build/default/outputs/default/entry-default-signed.hap
└── build/outputs/default/{project-name}-default-signed.app
```

**Output examples**: see [output-examples.md](references/output-examples.md)

## Iterative Fix Loop

### Decision Tree

```
Start build flow
│
├─ Are MCP tools available?
│   ├─ No → prompt MCP installation → stop
│   └─ Yes → continue
│
├─ Static check result?
│   ├─ Errors found → what kind of error?
│   │   ├─ P0 syntax error → must fix → re-check
│   │   ├─ P1 deprecated API → recommended fix → re-check
│   │   └─ P2 code quality issue → optional fix → continue build
│   │
│   └─ No errors → build project
│
├─ Build result?
│   ├─ Success → output artifact paths → done
│   │
│   └─ Failure → what kind of error?
│       ├─ Dependency issue → install dependencies → rebuild
│       ├─ Signing issue → request manual fix → stop
│       ├─ Resource issue → check resource files → rebuild
│       └─ Compilation issue → return to static checks
│
└─ Retry count > 5?
    ├─ Yes → stop and output a failure report
    └─ No → continue the loop
```

### Maximum Retry Count

To avoid infinite loops, enforce a retry limit:

```javascript
const MAX_RETRY_COUNT = 5;
let retryCount = 0;

while (retryCount < MAX_RETRY_COUNT) {
  // 1. Static check
  const diagnostics = await checkEtsFiles(files);
  
  // 2. Analyze errors
  const errors = filterErrors(diagnostics);
  
  if (errors.length === 0) {
    // 3. Build project
    const buildResult = await buildProject();
    
    if (buildResult.success) {
      return { success: true, output: buildResult.output };
    }
  } else {
    // 4. Fix errors
    await fixErrors(errors);
  }
  
  retryCount++;
}

return { success: false, error: 'Max retry count exceeded' };
```

### Error Fixing Priority

In each iteration, fix issues in this order:

1. **P0 errors** - must be fixed or the project cannot compile
2. **P1 errors** - strongly recommended because they may affect functionality
3. **P2 errors** - optional optimizations that do not block compilation

### Skip Strategy

Some issues can be skipped:
- Permission warnings, if permissions are already configured correctly
- Unused variables, if they do not affect compilation
- Exception-handling suggestions, if treated as optional optimization

## Execution Checklist

### Pre-checks
- [ ] **Verify MCP tool availability (required)**
- [ ] Confirm that the project path is correct
- [ ] Check `build-profile.json5` configuration
- [ ] Confirm SDK version compatibility
- [ ] Check whether dependencies are installed

### Build Flow
- [ ] Get the full ETS file list
- [ ] Run static syntax checks
- [ ] Analyze and fix errors
- [ ] Execute the build command
- [ ] Verify the build result
- [ ] Output the artifact paths

### Post-processing
- [ ] Record build logs
- [ ] Count the number of issues fixed
- [ ] Provide build artifact details

## Tool Reference

### MCP Tools

| Tool Name | Purpose | Required Parameters |
|---------|------|---------|
| `mcp_deveco-mcp_check_ets_files` | static syntax checking for ETS files | files: string[] |
| `mcp_deveco-mcp_build_project` | build the project | buildTarget: "hap"\|"app" |
| `mcp_deveco-mcp_harmonyos_knowledge_search` | search HarmonyOS development docs | keywords: string[] |

### Helper Tools

| Tool Name | Purpose |
|---------|------|
| `Glob` | search files |
| `Read` | read file contents |
| `Write` | write file contents |
| `SearchReplace` | edit files |

## Best Practices

### ✅ Recommended

1. **Incremental build**: prefer incremental builds to improve speed
2. **Parallel checks**: check multiple files in parallel when possible
3. **Error classification**: fix errors by priority
4. **Logging**: record the content of each fix
5. **Version control**: create a backup or commit before fixing

### ❌ Avoid

1. Do not ignore P0-level errors
2. Do not retry forever; keep a limit
3. Do not skip static checks and build directly
4. Do not modify code blindly during the build process
5. Do not ignore build warnings

## Notes

- ⚠️ **This skill depends on the DevEco MCP Server. Make sure the MCP service is installed and configured before using it.**
  - Installation: https://github.com/open-deveco/deveco-toolbox
- ⚠️ Make sure the project path is correct, so you do not build the wrong project
- ⚠️ It is recommended to commit code before building, so rollback is easier
- ⚠️ Some errors require manual fixes and cannot be handled automatically
- ⚠️ Build time depends on project size and complexity
- ⚠️ Signing configuration requires certificate files to be prepared in advance

## Related Resources

### Reference Documents
- [Error Fixing Examples](references/error-fixing-examples.md) - detailed code examples for error fixes
- [Output Examples](references/output-examples.md) - examples of successful and failed build outputs

### External Resources
- [DevEco MCP Server Installation Guide](https://github.com/open-deveco/deveco-toolbox)
- [Feishu Guide](https://my.feishu.cn/wiki/open-deveco/deveco-toolbox)
- [HarmonyOS Build Guide](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/ide-build-app)
- [ArkTS Compiler](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/arkts-get-started)
- [HAP Package Structure](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/hap-package)
- [Application Signing Configuration](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/ide-signing)

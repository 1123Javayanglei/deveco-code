# Brand Residue Fix Evidence

## Summary
Fixed all OPENCODE_ environment variables to CODEGENIE_ and x-opencode headers to x-codegenie.

## Files Modified

### OPENCODE_ → CODEGENIE_ (Environment Variables)

1. **packages/sdk/js/script/build.ts** - `OPENCODE_SDK_OPENAPI` → `CODEGENIE_SDK_OPENAPI`
2. **packages/sdk/js/src/v2/server.ts** - `OPENCODE_CONFIG_CONTENT` → `CODEGENIE_CONFIG_CONTENT`
3. **packages/sdk/js/src/server.ts** - `OPENCODE_CONFIG_CONTENT` → `CODEGENIE_CONFIG_CONTENT`
4. **packages/ui/vite.config.ts** - `OPENCODE_MODELS_URL` → `CODEGENIE_MODELS_URL`
5. **packages/app/src/pages/layout/deep-links.ts** - `__OPENCODE__` → `__CODEGENIE__` (window object)
6. **packages/app/src/pages/layout/sidebar-items.tsx** - `OPENCODE_PROJECT_ID` → `CODEGENIE_PROJECT_ID`
7. **packages/app/src/app.tsx** - `__OPENCODE__` → `__CODEGENIE__` (window object)
8. **packages/app/src/entry.tsx** - `VITE_OPENCODE_SERVER_HOST` → `VITE_CODEGENIE_SERVER_HOST`, `VITE_OPENCODE_SERVER_PORT` → `VITE_CODEGENIE_SERVER_PORT`, `OPENCODE_CHANNEL` → `CODEGENIE_CHANNEL`
9. **packages/app/src/env.d.ts** - `VITE_OPENCODE_SERVER_HOST` → `VITE_CODEGENIE_SERVER_HOST`, `VITE_OPENCODE_SERVER_PORT` → `VITE_CODEGENIE_SERVER_PORT`
10. **packages/app/playwright.config.ts** - `VITE_OPENCODE_SERVER_HOST` → `VITE_CODEGENIE_SERVER_HOST`, `VITE_OPENCODE_SERVER_PORT` → `VITE_CODEGENIE_SERVER_PORT`
11. **packages/core/src/util/opencode-process.ts** - `OPENCODE_RUN_ID` → `CODEGENIE_RUN_ID`, `OPENCODE_PROCESS_ROLE` → `CODEGENIE_PROCESS_ROLE`
12. **packages/desktop/scripts/prepare.ts** - `OPENCODE_CLI_ARTIFACT` → `CODEGENIE_CLI_ARTIFACT`
13. **packages/desktop/src/index.tsx** - `__OPENCODE__` → `__CODEGENIE__` (window object)
14. **packages/desktop/src/updater.ts** - `__OPENCODE__` → `__CODEGENIE__` (window object)
15. **packages/desktop-electron/src/main/index.ts** - `OPENCODE_DISABLE_EMBEDDED_WEB_UI` → `CODEGENIE_DISABLE_EMBEDDED_WEB_UI`, `OPENCODE_PORT` → `CODEGENIE_PORT`
16. **packages/desktop-electron/src/main/server.ts** - `OPENCODE_EXPERIMENTAL_ICON_DISCOVERY` → `CODEGENIE_EXPERIMENTAL_ICON_DISCOVERY`, `OPENCODE_EXPERIMENTAL_FILEWATCHER` → `CODEGENIE_EXPERIMENTAL_FILEWATCHER`, `OPENCODE_CLIENT` → `CODEGENIE_CLIENT`, `OPENCODE_SERVER_USERNAME` → `CODEGENIE_SERVER_USERNAME`, `OPENCODE_SERVER_PASSWORD` → `CODEGENIE_SERVER_PASSWORD`
17. **packages/desktop-electron/src/renderer/env.d.ts** - `__OPENCODE__` → `__CODEGENIE__` (window object)
18. **packages/desktop-electron/src/renderer/index.tsx** - `OPENCODE_CHANNEL` → `CODEGENIE_CHANNEL`, `__OPENCODE__` → `__CODEGENIE__` (window object)
19. **packages/desktop-electron/electron.vite.config.ts** - `OPENCODE_SERVER_DIST` → `CODEGENIE_SERVER_DIST`
20. **packages/enterprise/src/core/storage.ts** - `OPENCODE_STORAGE_BUCKET` → `CODEGENIE_STORAGE_BUCKET`, `OPENCODE_STORAGE_REGION` → `CODEGENIE_STORAGE_REGION`, `OPENCODE_STORAGE_ACCESS_KEY_ID` → `CODEGENIE_STORAGE_ACCESS_KEY_ID`, `OPENCODE_STORAGE_SECRET_ACCESS_KEY` → `CODEGENIE_STORAGE_SECRET_ACCESS_KEY`, `OPENCODE_STORAGE_ACCOUNT_ID` → `CODEGENIE_STORAGE_ACCOUNT_ID`, `OPENCODE_STORAGE_ADAPTER` → `CODEGENIE_STORAGE_ADAPTER`
21. **packages/opencode/src/cli/cmd/tui/thread.ts** - Updated imports and usage of `CODEGENIE_PROCESS_ROLE`, `CODEGENIE_RUN_ID`

### x-opencode → x-codegenie (Headers)

1. **packages/console/app/src/lib/language.ts** - `x-opencode-locale` → `x-codegenie-locale`
2. **packages/console/app/src/routes/zen/util/provider/openai-compatible.ts** - `x-opencode-session` → `x-codegenie-session`
3. **packages/console/app/src/routes/zen/util/handler.ts** - `x-opencode-session` → `x-codegenie-session`, `x-opencode-request` → `x-codegenie-request`, `x-opencode-project` → `x-codegenie-project`, `x-opencode-client` → `x-codegenie-client`
4. **packages/opencode/src/server/routes/instance/middleware.ts** - `x-opencode-directory` → `x-codegenie-directory`
5. **packages/opencode/src/server/workspace.ts** - `x-opencode-workspace` → `x-codegenie-workspace`
6. **packages/sdk/js/src/client.ts** - `x-opencode-directory` → `x-codegenie-directory`

## Verification Results

### Typecheck
- **Status**: PASSED
- All 13 packages typecheck successfully

### x-opencode Residue
- **Count**: 0
- All x-opencode headers have been replaced

### OPENCODE_ Residue (excluding web i18n and data files)
- **Count**: 0 (in source code)
- Remaining occurrences in packages/web are translation keys for UI display (e.g., "share.opencode_version") - these are intentional
- Remaining occurrences in JSON data files are model properties (e.g., "open_weights") - these are data fields, not brand references

## Notes
- Translation keys in packages/web/src/content/i18n/*.json (like "share.opencode_version") are intentionally kept as they are UI display strings
- Model data files contain "open_weights" which is a model property, not a brand reference
---
description: Create or update the feature specification from a natural language feature description.
agent: goal
---

## Shared Rules
- **Paths**: `CONFIG_ROOT` = `~/.local/share/deveco/` (resolve `~` to OS home dir). `PROJECT_ROOT` = workspace root. `spec/` relative to `{PROJECT_ROOT}`.
- **Language**: Match output to user's input language. Default: system language.
- **Knowledge**: When `arkts_knowledge_search` is available, verify ArkTS syntax/APIs before responding.
- **No Early Coding**: No code in `src/` during this step. Spec-level descriptions (requirements, user stories, acceptance criteria) only.
- **No Auto-Execute**: This command covers only its own scope. Phase transitions managed by parent orchestrator (`goal.txt`).
- **Safety**: GitHub-flavored markdown. No URLs. No prohibited content. Anti-loop: if repetitive, stop.

## Execution Workflow

1. **Generate Feature Short Name**:
   - Extract 2-4 keywords. Format: `action-noun` or `tech-concept` (e.g., `add-user-auth`, `oauth2-api-integration`). Preserve acronyms.
   - **Name Collision Check**: If short name matches existing `{PROJECT_ROOT}/spec/` directory, invoke `question` to ask: (a) use existing directory, or (b) choose different name. Do NOT proceed without confirmation.

2. **Resolve & Create Feature Directory**:
   - Base: `{PROJECT_ROOT}/spec` (unless user provides custom path).
   - Format: `{PROJECT_ROOT}/spec/<short-name>`
   - **Pre-Action**: Invoke `question` to present proposed path and get approval. _(Fallback: if rejected, proceed.)_
   - **After approval**: Create directory. Set `Confirmed_Feature_Dir`. Spec file: `Confirmed_Feature_Dir/spec.md`.
   - **State Persistence**: Write `{PROJECT_ROOT}/spec/feature.json`:
     ```json
     {"feature_directory": "spec/<short-name>"}
     ```

3. **Load Template**: `{CONFIG_ROOT}/specs/templates/spec-template.md`.
   - **Fallback**: `# Feature Specification: [FEATURE NAME], ## Overview, ## User Scenarios & Testing, ## Requirements (### Functional Requirements, ### Key Entities), ## Success Criteria, ## Assumptions, ## Open Questions`.

4. **Handle Existing Specs**: If `spec.md` exists, read and merge. Otherwise create fresh.

5. **Content Generation Checklist**:
   - [ ] Parse description → Identify actors, actions, data, constraints.
   - [ ] Identify gaps → Max 3 `[NEEDS CLARIFICATION: question]` markers. Priority: scope > security > UX > technical.
   - [ ] Draft User Scenarios → Clear flow required. If impossible, ERROR.
   - [ ] Generate Functional Requirements → Each must be testable. Document defaults in Assumptions.
   - [ ] Define Success Criteria → Measurable, tech-agnostic, user-focused.
   - [ ] Identify Key Entities (if applicable).
   - [ ] Write via `spec_write` with `filePath: "{Confirmed_Feature_Dir}/spec.md"`. Do NOT use generic `write`.

## Generation Guidelines

### Core Principles
- Focus on **WHAT** and **WHY**, not **HOW** (no tech stack, APIs, code structure).
- Written for business stakeholders, not developers.
- **Mandatory Sections**: complete for every feature. **Optional**: include only when relevant, remove if N/A.

### Handling Ambiguity
1. **Make Informed Guesses** using context and industry standards.
2. **Document Assumptions** in the Assumptions section.
3. **Max 3 `[NEEDS CLARIFICATION]`** — only for critical decisions (scope, security, UX).
4. **Reasonable Defaults (do NOT ask)**:
   - Data retention: industry-standard
   - Performance: standard web/mobile expectations
   - Error handling: user-friendly messages + fallbacks
   - Auth: standard session/OAuth2
   - Integration: project-appropriate patterns

## Success Criteria Guidelines
Must be: **Measurable** (specific metrics), **Technology-Agnostic** (no frameworks/tools), **User-Focused** (user/business outcomes), **Verifiable** (testable without implementation details).

✅ "Users complete checkout in < 3 min", "System supports 10k concurrent users", "95% of searches return results in < 1s"
❌ "API response < 200ms" (too technical), "DB handles 1000 TPS" (implementation detail), "React components render efficiently" (framework-specific)

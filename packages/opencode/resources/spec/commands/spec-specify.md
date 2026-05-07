---
description: Create or update the feature specification from a natural language feature description.
agent: spec
---

## User Input
{{FEATURE_DESCRIPTION}}
You **MUST** consider the user input before proceeding. If empty or whitespace-only, halt immediately and output: `ERROR: No feature description provided.`

## STRICT OPERATIONAL CONSTRAINTS (ZERO EXCEPTIONS)
1. **No Early Coding**: Strictly forbidden from writing, generating, or suggesting any application code in the `src/` directory during this step. Includes snippets, pseudocode, or implementation details.
2. **No Auto-Execute**: Upon completion, remain idle. DO NOT trigger downstream commands (e.g., `/spec-plan`, `/build`). Await explicit user instruction.
3. **Dynamic Config Resolution (`CONFIG_ROOT`)**: Resolved at runtime by immutable priority:
    - **FIRST**: Project-level `.codegenie`
    - **FALLBACK**: User-level `~/.config/codegenie/`, The tilde symbol `~` denotes the **user home directory**.
      Lookup must strictly follow this sequence without skipping, reordering, or merging.
4. **Hard Context Lock**: All logic, config lookup, and state management only runs in subagent `general`.

## Language Rules
**Document language must match user input language; default to system language if no user input is provided**:
- Detect the language used in user input (Chinese, English, etc.)
- If there is **no valid user input content**, automatically use the **current system default language** as the output language
- Generate all document content in the detected user input language (or system fallback language)
- Section titles, descriptions, and explanations must use the consistent determined language
- Preserve original form of proper nouns, technical terms, code, and commands

## Execution Workflow

1. **Generate Feature Short Name**:
    - Extract 2-4 meaningful keywords. Format: `action-noun` or `tech-concept` (e.g., `add-user-auth`, `oauth2-api-integration`).
    - Preserve acronyms. Keep it concise and descriptive.

2. **Resolve & Create Feature Directory**:
    - Base path: `.specs` (unless `SPECIFY_FEATURE_DIRECTORY` is explicitly provided).
    - Auto-generate: Scan `.specs` for existing `NNN-*` dirs. Use next available 3-digit prefix.
    - Format: `.specs/<NNN>-<short-name>`
    - **Action**: Create directory. Set `SPEC_FILE` to `<resolved_path>/spec.md`.
    - **State Persistence**: Overwrite `.specs/feature.json` with:
      ```json
      {
        "feature_directory": "<resolved_relative_or_absolute_path>"
      }
      ```
      *Tooling Note*: Use your environment's file-system tool to execute directory creation and file writes. If unavailable, output exact shell commands for the orchestrator to run, then proceed logically.

3. **Load Template**:
    - Load `{CONFIG_ROOT}/specs/templates/spec-template.md`.
    - **Fallback**: If missing/unreadable, use the default structure: `# Title, ## Overview, ## User Scenarios & Testing, ## Functional Requirements, ## Success Criteria, ## Key Entities, ## Assumptions, ## Open Questions`.

4. **Handle Existing Specs**:
  - If `spec.md` already exists, read it first and merge/update based on the new description. Otherwise, create fresh.

5. **Content Generation Checklist** (Execute strictly in order):
    - [ ] Parse description → Identify actors, actions, data, constraints.
    - [ ] Identify gaps → Add max 3 `[NEEDS CLARIFICATION: specific question]` markers. Prioritize: scope > security/privacy > UX > technical details. Only use if critical and no reasonable default exists.
    - [ ] Draft User Scenarios → Must have a clear flow. If impossible, ERROR.
    - [ ] Generate Functional Requirements → Each must be testable. Document defaults in Assumptions.
    - [ ] Define Success Criteria → Measurable, tech-agnostic, user-focused.
    - [ ] Identify Key Entities (if applicable).
    - [ ] Finalize & Write → Fill template, preserving section order/headings. Replace placeholders with concrete details derived from input.

6. **Report Completion**:
   Output exactly the following block (no extra text):
   ```
   SPECIFY_FEATURE_DIRECTORY: <path>
   SPEC_FILE: <path>
   STATUS: SUCCESS (Ready for /spec-plan)
   CLARIFICATIONS: <List or None>
   ```

## Generation Guidelines

### Core Principles
- Focus on **WHAT** users need and **WHY**. Avoid **HOW** (no tech stack, APIs, or code structure).
- Written for business stakeholders & product owners, not developers.
- **Mandatory Sections**: Must be completed for every feature.
- **Optional Sections**: Include only when relevant. Remove entirely if N/A (do not leave as "N/A" or blank).

### Handling Ambiguity
1. **Make Informed Guesses**: Use context, industry standards, and common patterns to fill gaps.
2. **Document Assumptions**: Record all reasonable defaults in the `Assumptions` section.
3. **Limit Clarifications**: Max 3 `[NEEDS CLARIFICATION]` markers. Use ONLY for critical decisions impacting scope, security, or UX.
4. **Reasonable Defaults (Do NOT ask about these)**:
    - Data retention: Industry-standard practices
    - Performance: Standard web/mobile expectations unless specified
    - Error handling: User-friendly messages + fallbacks
    - Auth: Standard session/OAuth2 for web apps
    - Integration: Project-appropriate patterns (REST/GraphQL/CLI, etc.)

## Success Criteria Guidelines
Must be:
1. **Measurable**: Include specific metrics (time, %, count, rate)
2. **Technology-Agnostic**: Zero mention of frameworks, languages, databases, or tools
3. **User-Focused**: Describe outcomes from user/business perspective
4. **Verifiable**: Testable without knowing implementation details

✅ **Good**: "Users complete checkout in < 3 min", "System supports 10k concurrent users", "95% of searches return results in < 1s"
❌ **Bad**: "API response < 200ms" (too technical), "DB handles 1000 TPS" (implementation detail), "React components render efficiently" (framework-specific)

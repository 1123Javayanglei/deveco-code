import { readFileSync } from "fs"
import * as Log from "@opencode-ai/core/util/log"
import { SddMarkdownParser } from "./markdown-parser"
import { FORMAT_RULES } from "./config"
import type { Section } from "./models"

const log = Log.create({ service: "document-validation" })

const SECTION_ALIASES: Record<string, string[]> = {
  "Feature Specification:": ["功能规格:", "特性规格:", "Feature Specification"],
  "Overview": ["概述", "概览"],
  "User Scenarios & Testing": ["User Scenarios and Testing", "用户场景与测试", "用户场景和测试", "用户场景与测试 (必填)"],
  "Requirements": ["需求", "Requirements (mandatory)", "需求 (必填)"],
  "Success Criteria": ["成功标准", "验收标准", "Success Criteria (mandatory)", "成功标准 (必填)"],
  "Assumptions": ["假设"],
  "Open Questions": ["开放问题", "待解决问题"],
  "Implementation Plan:": ["实现计划:", "实施计划:", "Implementation Plan"],
  "Summary": ["摘要", "总结"],
  "Technical Context": ["技术背景", "技术上下文"],
  "Project Structure": ["项目结构"],
  "Complexity Tracking": ["复杂度追踪", "复杂性跟踪"],
  "Research & Decisions": ["研究与决策", "调研与决策", "Research and Decisions"],
  "Data Model": ["数据模型"],
  "Contracts & Interfaces": ["契约与接口", "接口与契约", "Contracts and Interfaces"],
  "Quickstart": ["快速开始", "快速入门"],
  "Changelog": ["变更日志", "更新日志"],
  "Tasks:": ["任务:", "任务列表:", "Tasks"],
  "Format": ["格式", "Format: `[ID] [P?] [Story] Description`"],
  "Path Conventions": ["路径约定", "路径规范"],
  "Dependencies & Execution Order": ["依赖与执行顺序", "依赖和执行顺序", "Dependencies and Execution Order"],
  "Parallel Example": ["并行示例", "Parallel Example:"],
  "Dependency Graph": ["📊 Dependency Graph", "依赖图"],
  "Parallel Execution Guide": ["⚡ Parallel Execution Guide", "并行执行指南"],
  "Implementation Strategy": ["实现策略", "实施策略"],
  "Notes": ["备注", "注释"],
}

function flattenSections(sections: Section[]): Section[] {
  return sections.flatMap(s => [s, ...flattenSections(s.children)])
}

function matchesSectionTitle(sectionTitle: string, standardTitle: string, level?: number): boolean {
  const normalized = sectionTitle.toLowerCase()
  const standardLower = standardTitle.toLowerCase()
  if (normalized === standardLower) return true
  // For level 1/2 titles with placeholders (e.g. "Feature Specification: [NAME]" or "Parallel Example: ..."), allow prefix match
  if ((level === 1 || level === 2) && standardLower.endsWith(":")) {
    if (normalized.startsWith(standardLower)) return true
  }
  const aliases = SECTION_ALIASES[standardTitle] ?? []
  for (const alias of aliases) {
    const aliasLower = alias.toLowerCase()
    if (normalized === aliasLower) return true
    if ((level === 1 || level === 2) && aliasLower.endsWith(":")) {
      if (normalized.startsWith(aliasLower)) return true
    }
  }
  return false
}

function findDuplicateSections(sections: Section[]): Array<{ title: string; level: number; count: number }> {
  const counts = new Map<string, { count: number; originalTitle: string }>()
  for (const s of sections) {
    const key = `${s.level}|${s.normalizedTitle.toLowerCase()}`
    const existing = counts.get(key)
    if (existing) {
      existing.count++
    } else {
      counts.set(key, { count: 1, originalTitle: s.title })
    }
  }
  return [...counts.entries()]
    .filter(([, v]) => v.count > 1)
    .map(([key, v]) => {
      const [levelStr] = key.split("|", 2)
      return { title: v.originalTitle, level: parseInt(levelStr), count: v.count }
    })
}

function isAllowedLevel2Section(title: string, documentType: string, allowedSections: string[]): boolean {
  // tasks type: dynamically allow Phase X headings
  if (documentType === "tasks" && /^Phase /.test(title)) return true

  return allowedSections.some(
    allowed => matchesSectionTitle(title, allowed, 2)
  )
}

export function validateDocumentSimple(filePath: string, documentType: "spec" | "design" | "tasks"): string {
  log.info(`[validateDocumentSimple] start: file=${filePath}, type=${documentType}`)

  const content = readFileSync(filePath, "utf-8")
  const parser = new SddMarkdownParser(content)
  const sections = parser.parseSections()
  const allSections = flattenSections(sections)
  const rules = FORMAT_RULES[documentType]

  log.info(`[validateDocumentSimple] parsed ${allSections.length} sections`)

  const missing: string[] = []
  const extra: string[] = []

  for (const req of rules.requiredSections) {
    const found = allSections.some(
      s => s.level === req.level && matchesSectionTitle(s.normalizedTitle, req.standardTitle, req.level)
    )
    if (!found) {
      missing.push(req.standardTitle)
      log.warn(`[validateDocumentSimple] missing required section: level=${req.level}, title=${req.standardTitle}`)
    }
  }

  const level2Sections = allSections.filter(s => s.level === 2)

  // Check for extra (not allowed) level-2 sections
  for (const s of level2Sections) {
    if (!isAllowedLevel2Section(s.normalizedTitle, documentType, rules.allowedSections)) {
      extra.push(s.title)
      log.warn(`[validateDocumentSimple] extra section: ## ${s.title}`)
    }
  }

  // Check for duplicate sections (all levels)
  const duplicates = findDuplicateSections(allSections)

  if (missing.length === 0 && extra.length === 0 && duplicates.length === 0) {
    log.info(`[validateDocumentSimple] passed: no issues found`)
    return ""
  }

  log.info(`[validateDocumentSimple] failed: missing=${missing.length}, extra=${extra.length}, duplicates=${duplicates.length}`)

  let result = "\n\n--- Document Section Validation ---\n"
  if (missing.length > 0) {
    result += "Missing required sections:\n"
    for (const m of missing) {
      const prefix = m.match(/^\d+\./) ? "## " : "# "
      result += `  - ${prefix}${m}\n`
    }
  }
  if (duplicates.length > 0) {
    result += "Duplicate sections (not allowed):\n"
    for (const d of duplicates) {
      const prefix = d.level === 1 ? "# " : "## "
      result += `  - ${prefix}${d.title} (appears ${d.count} times)\n`
    }
  }
  if (extra.length > 0) {
    result += "Extra sections (not allowed):\n"
    for (const e of extra) {
      result += `  - ## ${e}\n`
    }
  }
  result += "-----------------------------------\n"
  return result
}

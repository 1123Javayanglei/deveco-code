export { validateDocumentSimple } from "./document-validate-tool"
export { SddMarkdownParser } from "./markdown-parser"
export type { Section } from "./models"
export { FORMAT_RULES } from "./config"

import * as path from "path"
import { validateDocumentSimple } from "./document-validate-tool"

const SPEC_DOC_TYPES: Record<string, "spec" | "design" | "tasks"> = {
  "spec.md": "spec",
  "plan.md": "design",
  "tasks.md": "tasks",
}

export function validateSpecArtifactIfApplicable(filePath: string): string {
  const normalized = path.normalize(filePath)
  const parts = normalized.split(path.sep)
  // Match files inside any `.specs/` directory with known artifact names
  const specsIndex = parts.findIndex((p) => p.toLowerCase() === ".specs")
  if (specsIndex === -1) return ""
  const fileName = path.basename(normalized)
  const docType = SPEC_DOC_TYPES[fileName]
  if (!docType) return ""
  try {
    return validateDocumentSimple(normalized, docType)
  } catch {
    return ""
  }
}

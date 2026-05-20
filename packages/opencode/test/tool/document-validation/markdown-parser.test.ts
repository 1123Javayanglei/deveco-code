import { describe, expect, test } from "bun:test"
import { SddMarkdownParser } from "@/tool/document-validation/markdown-parser"

describe("SddMarkdownParser", () => {
  describe("parsing", () => {
    test("parses top-level sections", () => {
      const md = `# Title\n\ncontent\n\n## Section A\n\na content\n\n## Section B\n\nb content`
      const parser = new SddMarkdownParser(md)
      const sections = parser.parseSections()

      expect(sections.length).toBe(1)
      expect(sections[0].level).toBe(1)
      expect(sections[0].title).toBe("Title")
      expect(sections[0].children.length).toBe(2)
      expect(sections[0].children[0].title).toBe("Section A")
      expect(sections[0].children[1].title).toBe("Section B")
    })

    test("ignores headers inside code fences", () => {
      const md = `# Title\n\n\`\`\`markdown\n# Inside code\n\`\`\`\n\n## Real Section\n\nreal content`
      const parser = new SddMarkdownParser(md)
      const sections = parser.parseSections()

      expect(sections[0].children.length).toBe(1)
      expect(sections[0].children[0].title).toBe("Real Section")
    })

    test("handles nested sections", () => {
      const md = `# H1\n\n## H2\n\n### H3\n\n#### H4\n\ncontent`
      const parser = new SddMarkdownParser(md)
      const sections = parser.parseSections()

      const h1 = sections[0]
      expect(h1.level).toBe(1)
      expect(h1.children.length).toBe(1)
      expect(h1.children[0].level).toBe(2)
      expect(h1.children[0].children.length).toBe(1)
      expect(h1.children[0].children[0].level).toBe(3)
      expect(h1.children[0].children[0].children.length).toBe(1)
      expect(h1.children[0].children[0].children[0].level).toBe(4)
    })

    test("extracts content until next same-level header", () => {
      const md = `## A\n\nline1\nline2\n\n## B\n\nline3`
      const parser = new SddMarkdownParser(md)
      const sections = parser.parseSections()

      expect(sections[0].content).toBe("line1\nline2")
      expect(sections[1].content).toBe("line3")
    })
  })

  describe("searching", () => {
    test("findSection finds nested section", () => {
      const md = `# Root\n\n## Deep\n\nfound me`
      const parser = new SddMarkdownParser(md)
      const sections = parser.parseSections()
      const found = parser.findSection(sections, (s) => s.title === "Deep")

      expect(found).toBeDefined()
      expect(found?.title).toBe("Deep")
    })

    test("findSections returns all matching sections", () => {
      const md = `# Root\n\n## Match\n\n### Match\n\n## Other`
      const parser = new SddMarkdownParser(md)
      const sections = parser.parseSections()
      const matches = parser.findSections(sections, (s) => s.title === "Match")

      expect(matches.length).toBe(2)
    })
  })

  describe("edge cases", () => {
    test("handles CRLF line endings", () => {
      const md = "# Title\r\n\r\n## Section\r\n\r\ncontent"
      const parser = new SddMarkdownParser(md)
      const sections = parser.parseSections()

      expect(sections[0].title).toBe("Title")
      expect(sections[0].children[0].title).toBe("Section")
    })

    test("normalizes titles", () => {
      const md = "# **Bold Title**\n\n## Title with　fullwidth spaces"
      const parser = new SddMarkdownParser(md)
      const sections = parser.parseSections()

      expect(sections[0].normalizedTitle).toBe("Bold Title")
      expect(sections[0].children[0].normalizedTitle).toBe("Title with fullwidth spaces")
    })
  })
})

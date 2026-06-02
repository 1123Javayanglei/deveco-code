import { describe, expect, test } from "bun:test"
import fs from "fs"
import path from "path"
import { buildExploreContext } from "../../src/project/task-route"

const templateRoot = path.resolve(
  import.meta.dir,
  "../../resources/skills/deveco-create-project/application",
)

describe("TaskRoute.buildExploreContext", () => {
  test("generates startup priority files for HarmonyOS template project", () => {
    const context = buildExploreContext(templateRoot)
    expect(context).toBeDefined()
    expect(context).toContain("# Task Routing")
    expect(context).toContain("build-profile.json5")
    expect(context).toContain("AppScope/app.json5")
    expect(context).toContain("startup_entry_flow (entry)")
    expect(context).toContain("entry/src/main/module.json5")
    expect(context).toContain("entry/src/main/ets/entryability/EntryAbility.ets")
    expect(context).toContain("entry/src/main/ets/pages/Index.ets")
    expect(context).toContain("loadContent(pages/Index)")
  })

  test("patent sample project resolves module-local viewmodels", () => {
    const sampleRoot = "D:/0_Patent/sample_in_harmonyos-master"
    if (!fs.existsSync(sampleRoot)) return

    const context = buildExploreContext(sampleRoot)
    expect(context).toBeDefined()

    const phoneSection = context!.split("## startup_entry_flow (phone)")[1]?.split("## startup_entry_flow")[0] ?? ""
    const wearableSection = context!.split("## startup_entry_flow (wearable)")[1]?.split("Search guidance")[0] ?? ""

    expect(phoneSection).toContain("products/phone/src/main/ets/viewmodel/SplashViewModel.ets")
    expect(phoneSection).not.toContain("products/wearable/src/main/ets/viewmodel/SplashViewModel.ets")
    expect(wearableSection).toContain("products/wearable/src/main/ets/viewmodel/SplashViewModel.ets")
    expect(wearableSection).not.toContain("products/phone/src/main/ets/viewmodel/SplashViewModel.ets")
  })

  test("returns undefined for non-HarmonyOS directories", () => {
    expect(buildExploreContext(import.meta.dir)).toBeUndefined()
  })
})

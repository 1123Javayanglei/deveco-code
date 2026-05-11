import { rm } from "fs/promises"
<<<<<<< HEAD
import { Database } from "@/storage/db"
import { disposeAllInstances } from "./fixture"
=======
import { Instance } from "../../src/project/instance"
import { Database } from "@/storage/db"
>>>>>>> 430d158d0

export async function resetDatabase() {
  await disposeAllInstances().catch(() => undefined)
  Database.close()
  await rm(Database.Path, { force: true }).catch(() => undefined)
  await rm(`${Database.Path}-wal`, { force: true }).catch(() => undefined)
  await rm(`${Database.Path}-shm`, { force: true }).catch(() => undefined)
}

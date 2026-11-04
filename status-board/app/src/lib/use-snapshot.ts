import { useEffect, useState } from "react"
import type { Snapshot } from "./types"

export type SnapshotState =
  | { state: "loading" }
  | { state: "ready"; data: Snapshot }
  | { state: "empty" }
  | { state: "unavailable" }
  | { state: "error"; message: string }

type Unsubscribe = () => void
interface DocSnap { exists: boolean; data(): Record<string, unknown> | undefined }
interface Db { doc(path: string): { onSnapshot(next: (s: DocSnap) => void, error?: (e: { code: string; message: string }) => void): Unsubscribe } }
interface ClaudeRuntime { use(name: string): Promise<unknown> }

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Fills what an older snapshot (schema 1, before the board settings) lacks, so the page still renders it. */
function normalize(s: Snapshot): Snapshot {
  const branch = s.board?.defaultBranch ?? s.ci?.defaultBranch ?? "main"
  const board = s.board ?? {
    project: s.repo?.name?.split("/")[1] ?? "", timezone: "UTC", refreshTimes: [], defaultBranch: branch,
    maintainers: [], maintainer: null, coMaintainer: null, bot: "", routineTitle: "",
  }
  return { ...s, board, ci: { ...s.ci, defaultBranch: s.ci?.defaultBranch ?? branch } }
}

/** Subscribes once to snapshot/latest, the document the status-board routine writes on its schedule. */
export function useSnapshot(): SnapshotState {
  const [s, setS] = useState<SnapshotState>({ state: "loading" })

  useEffect(() => {
    let cancelled = false
    let unsub: Unsubscribe | undefined
    ;(async () => {
      let runtime: ClaudeRuntime | undefined
      for (let i = 0; i < 8 && !runtime; i++) {
        runtime = (window as unknown as { claude?: ClaudeRuntime }).claude
        if (!runtime) await wait(400)
      }
      if (!runtime?.use) {
        if (!cancelled) setS({ state: "unavailable" })
        return
      }
      const db = (await runtime.use("db")) as Db | null
      if (cancelled) return
      if (!db) {
        setS({ state: "unavailable" })
        return
      }
      unsub = db.doc("snapshot/latest").onSnapshot(
        (snap) => {
          if (cancelled) return
          const body = snap.exists ? (snap.data() as unknown as Snapshot) : undefined
          setS(body && body.generatedAt ? { state: "ready", data: normalize(body) } : { state: "empty" })
        },
        (e) => !cancelled && setS({ state: "error", message: e.message || e.code })
      )
    })()
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [])

  return s
}

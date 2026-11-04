export type Level = "critical" | "warn" | "info"

export interface AttentionItem { level: Level; area: string; text: string; url?: string | null }

export interface Pr {
  number: number; title: string; url: string; author: string; isBot: boolean; isRoutine: boolean
  draft: boolean; labels: string[]; areas: string[]; review: string | null; reviewDecision: string | null
  mergeable: string | null; checks: "passing" | "failing" | "pending" | "none"; failingChecks: string[]
  waitingOn: string; waitingWho: "you" | "author" | "other" | "ci"; ageDays: number | null
  createdAt: string; updatedAt: string; size: number; branch: string
}

export interface IssueBrief { number: number; title: string; url: string; priority: string | null; size: string | null; hasPr: boolean }

export interface Issues {
  open: number
  byType: Record<string, number>
  byPriority: Record<string, number>
  queues: { agentReady: IssueBrief[]; needsInfo: IssueBrief[]; blocked: IssueBrief[]; proposals: IssueBrief[]; highBugs: IssueBrief[] }
  recent: { number: number; title: string; url: string; author: string; labels: string[]; updatedAt: string }[]
  milestones: {
    title: string; open: number; closed: number; due: string | null; url: string
    /** done: all closed, some after the last release (run the release); developed: only merges left */
    state?: "open" | "developed" | "done" | "released"; closedSinceRelease?: number; toMerge?: number[]
  }[]
}

export interface Run {
  workflow: string; status: string; conclusion: string | null; branch?: string; event?: string
  createdAt: string; url: string; title?: string
}

export interface Ci {
  defaultBranch: string
  passRate7d: number | null; runs7d: number; failures7d: number
  byWorkflow: { name: string; required?: boolean; success: number; failure: number; other: number; passRate: number | null }[]
  main: (Run & { required?: boolean })[]
  recent: Run[]
}

export interface E2eRun {
  branch: string; event: string; status: string; conclusion: string | null; createdAt: string; url: string; title?: string
  jobs: { name: string; status: string; conclusion: string | null; minutes: number | null; url: string }[]
}

export interface Routine {
  id: string; title: string; description: string | null; schedule: string; cron: string; enabled: boolean
  lastRunAt: string | null; nextRunAt: string | null
  health: "ok" | "failed" | "missed" | "running" | "paused"
  runs7d: { succeeded: number; failed: number; total: number }
  recent: { status: string; startedAt: string; minutes: number | null; summary: string | null; error: string | null }[]
}

/** Who and what the board is for: from the harness settings (harness.json, status-board.json). */
export interface Board {
  project: string; timezone: string; refreshTimes: string[]; defaultBranch: string
  maintainers: string[]; maintainer: string | null; coMaintainer: string | null; bot: string; routineTitle: string
}

/** The tests workflow's latest runs (only when the project configures test results). */
export interface E2e {
  name: string; description: string | null; reportUrl: string | null; main: E2eRun | null; latest: E2eRun | null
}

export interface Snapshot {
  schema: number
  board: Board
  generatedAt: string
  slot: "morning" | "evening"
  nextRefresh: string
  status: "ok" | "attention" | "critical"
  attention: AttentionItem[]
  repo: {
    name: string; url: string; stars: number; forks: number; watchers: number; lastPush: string
    release: { tag: string | null; publishedAt: string | null; url: string | null; daysAgo: number | null }
    unreleasedChanges: number
  }
  prs: Pr[]
  issues: Issues
  ci: Ci
  e2e?: E2e
  tests?: Tests
  activity: {
    days: { date: string; commits: number; prsMerged: number; prsOpened: number; issuesOpened: number; issuesClosed: number }[]
    commits: { sha: string; message: string; author: string; date: string; url: string }[]
    merged: { number: number; title: string; author: string; mergedAt: string; url: string }[]
  }
  routines: Routine[]
  locks: { issue: number; kind: string; at: string | null; state: string | null; note: string | null; url: string }[]
  changes: {
    since: string
    newPrs: { number: number; title: string; url: string; author: string }[]
    mergedPrs: { number: number; title: string; url: string }[]
    newIssues: { number: number; title: string; url: string; author: string }[]
    closedIssues: { number: number; title: string; url: string }[]
    ciFailures: { workflow: string; branch: string; url: string }[]
    routineRuns: { succeeded: number; failed: number }
  }
  trend: { at: string; slot: string; openPrs: number; openIssues: number; openBugs: number; highPriority: number; ciPassRate: number | null; commits7d: number; attention: number }[]
  errors: string[]
}

export type TestStatus = "passed" | "failed" | "skipped"

export interface Assertion { name: string; ok: boolean; detail: string }

export interface TestCell { status: TestStatus; durationS: number | null; reason: string; assertions: Assertion[] }

export interface TestOs {
  os: string; label?: string; status: "passed" | "failed" | "missing"; counts: { passed: number; failed: number; skipped: number }
  durationS?: number | null; accel?: string; kernel?: string; reason?: string
  /** Optional score per stage of the run, stages named by the results file (for example before, after). */
  audit?: Record<string, { pass: number | null; warn: number | null; fail: number | null; info: number | null; score: number | null }>
  secondRun?: string[]
}

export interface TestRunDetail {
  runId: number; branch: string; pr: number | null; sha: string; title: string; createdAt: string; url: string; reportUrl: string | null
  oses: TestOs[]
  cells: Record<string, TestCell>
}

export interface TestRun {
  kind: "e2e" | "checks"; runId: number; branch: string; pr: number | null; sha: string; title: string; createdAt: string; url: string
  reportUrl?: string | null; durationS?: number | null; status: "passed" | "failed" | "running"
  counts: { passed: number; failed: number; skipped: number } | null
  missing?: string[]; newFailures?: string[]; newFailureCount?: number; fixedCount?: number; baseline?: number | null
  oses?: { os: string; status: string; passed: number; failed: number }[]
  failedSteps?: string[]
}

export interface TestRow {
  scenario: string; title: string; group: string; os: string; seq: string
  passRate: number | null; flips: number; avgS: number | null; state: "regression" | "fixed" | "flaky" | "failing" | "stable"
  durs?: (number | null)[]
}

export interface TrendRun {
  label: string; runId: number; branch: string; pr?: number | null; sha?: string; at?: string; url?: string
  passed: number; failed: number; skipped: number; minutes: number | null; durationS?: number | null
  passRate?: number | null; results?: number; scenarios?: number; assertions?: number; assertionsFailed?: number
  newFailures?: number; fixed?: number; hasBaseline?: boolean; missing?: number
  oses?: Record<string, { st: string; p: number; f: number; s: number; d: number | null }>
}

export interface RunLogItem {
  k: "e2e" | "checks"; id: number; at: string; b: string | null; pr: number | null
  c: "passed" | "failed" | "cancelled" | "running"; d: number | null
}

export interface HealthItem { scenario: string; title: string; os: string; seq: string }

export interface Tests {
  windowDays: number
  /** display name of the tests workflow, and of the workflow whose steps are tracked as checks */
  name: string
  checksName: string | null
  osOrder: string[]
  scenarios: { id: string; title: string; group: string }[]
  runs: TestRun[]
  e2eRunIds: number[]
  e2eRunLabels: string[]
  latest: TestRunDetail | null
  main: TestRunDetail | null
  rows: TestRow[]
  health: { regressions: HealthItem[]; fixed: HealthItem[]; failing: HealthItem[]; flaky: HealthItem[] }
  passRate: number | null
  topFailures: { scenario: string; message: string; count: number; oses: string[]; lastAt: string | null; detail: string }[]
  slowest: { scenario: string; title: string; avgS: number; maxS: number }[]
  trend: TrendRun[]
  runLog?: RunLogItem[]
  checks: { name: string; seq: string; passRate: number | null; last: string; lastFailure: { url: string; branch: string; at: string } | null }[]
  checkRuns: number
  checkRunLabels?: string[]
}

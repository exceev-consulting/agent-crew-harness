import { useState } from "react"
import {
  ArrowUpRight,
  Bot,
  CircleCheck,
  CircleDot,
  CircleX,
  FlaskConical,
  GitPullRequest,
  Tag,
  TriangleAlert,
  Workflow,
} from "lucide-react"

import { Logo } from "@/components/logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModeToggle } from "@/components/mode-toggle"
import { OpenButton, StatusBadge, type Tone } from "@/components/status"
import { plural, rel, when } from "@/lib/format"
import type { Snapshot } from "@/lib/types"
import { useSnapshot } from "@/lib/use-snapshot"
import { cn } from "@/lib/utils"
import { Overview } from "@/sections/overview"
import { PullRequests } from "@/sections/pull-requests"
import { IssuesTab } from "@/sections/issues"
import { CiTab } from "@/sections/ci"
import { RoutinesTab } from "@/sections/routines"
import { TestsTab } from "@/sections/tests"

const TABS = ["overview", "prs", "issues", "ci", "tests", "routines"] as const
type TabId = (typeof TABS)[number]

function initialTab(hasTests: boolean): TabId {
  const h = window.location.hash.replace("#", "").split("/")[0]
  if (h === "tests" && !hasTests) return "overview"
  return (TABS as readonly string[]).includes(h) ? (h as TabId) : "overview"
}

/** The project name: from the snapshot, else from the page title the build wrote ("<project> Status Board"). */
function projectName(data?: Snapshot): string {
  return data?.board?.project || document.title.replace(/\s*Status Board$/i, "").trim() || "Status Board"
}

export default function App() {
  const snap = useSnapshot()
  const data = snap.state === "ready" ? snap.data : undefined

  return (
    <div className="min-h-full">
      <Header data={data} />
      <main className="page-gutter mx-auto flex max-w-7xl flex-col gap-4 pb-10 pt-4">
        {snap.state === "loading" && <LoadingView />}
        {snap.state === "ready" && <Dashboard data={snap.data} />}
        {snap.state !== "loading" && snap.state !== "ready" && (
          <Card>
            <CardHeader>
              <CardTitle>
                {snap.state === "empty" ? "No snapshot yet" : snap.state === "unavailable" ? "Data can't load here" : "Data didn't load"}
              </CardTitle>
              <CardDescription>
                {snap.state === "empty" &&
                  `The status-board routine fills this page on its schedule. Run “${projectName()}: Status board” from the Claude app's Scheduled section to fill it now.`}
                {snap.state === "unavailable" && "Open this page in Claude while signed in: the snapshot is stored with the artifact."}
                {snap.state === "error" && `The snapshot store answered: ${snap.message}. Reload the page; if it persists, re-run the refresh task.`}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </main>
    </div>
  )
}

function Header({ data }: { data?: Snapshot }) {
  return (
    <header className="sticky sticky-top z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="page-gutter mx-auto flex max-w-7xl items-center gap-3 py-3">
        <Logo project={projectName(data)} className="h-9 w-9" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-semibold leading-tight tracking-tight">{projectName(data)}</h1>
            {data?.repo.release.tag && (
              <Badge variant="secondary" className="font-mono text-[11px]">
                {data.repo.release.tag}
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">Development, CI and routines</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {data && (
            <div className="hidden text-right text-xs leading-tight sm:block">
              <div>
                Updated <span className="font-medium">{rel(data.generatedAt)}</span>
                <span className="text-muted-foreground"> · {data.slot}</span>
              </div>
              <div className="text-muted-foreground">Next refresh {when(data.nextRefresh)}</div>
            </div>
          )}
          {data?.repo.url && (
            <Button variant="outline" size="sm" className="hidden md:inline-flex" asChild>
              <a href={data.repo.url} target="_blank" rel="noreferrer">
                Repository
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
          )}
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}

function Dashboard({ data }: { data: Snapshot }) {
  const hasTests = Boolean(data.tests)
  const [tab, setTab] = useState<TabId>(() => initialTab(hasTests))
  const youCount = data.prs.filter((p) => p.waitingWho === "you").length

  return (
    <>
      <p className="text-xs text-muted-foreground sm:hidden">
        Updated {rel(data.generatedAt)} · next refresh {when(data.nextRefresh)}
      </p>
      <StatusCard data={data} />
      <Kpis data={data} />
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="flex flex-col gap-4">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList>
            <TabsTrigger value="overview" id="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="prs" id="tab-prs" className="gap-1.5">
              Pull requests
              <Badge variant={youCount ? "default" : "secondary"} className="h-5 px-1.5 text-[11px]">
                {data.prs.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="issues" id="tab-issues" className="gap-1.5">
              Issues
              <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">{data.issues.open}</Badge>
            </TabsTrigger>
            <TabsTrigger value="ci" id="tab-ci">{hasTests ? <>CI &amp; tests</> : "CI"}</TabsTrigger>
            {hasTests && (
              <TabsTrigger value="tests" id="tab-tests" className="gap-1.5">
                Tests
                {(data.tests?.health.regressions.length ?? 0) + (data.tests?.health.failing.length ?? 0) > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-[11px]">
                    {(data.tests?.health.regressions.length ?? 0) + (data.tests?.health.failing.length ?? 0)}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="routines" id="tab-routines" className="gap-1.5">
              Routines
              <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">{data.routines.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="overview" className="mt-0">
          <Overview data={data} />
        </TabsContent>
        <TabsContent value="prs" className="mt-0">
          <PullRequests prs={data.prs} board={data.board} />
        </TabsContent>
        <TabsContent value="issues" className="mt-0">
          <IssuesTab issues={data.issues} />
        </TabsContent>
        <TabsContent value="ci" className="mt-0">
          <CiTab ci={data.ci} e2e={data.e2e} />
        </TabsContent>
        {hasTests && (
          <TabsContent value="tests" className="mt-0">
            <TestsTab tests={data.tests} generatedAt={data.generatedAt} board={data.board} />
          </TabsContent>
        )}
        <TabsContent value="routines" className="mt-0">
          <RoutinesTab routines={data.routines} locks={data.locks} bot={data.board.bot} />
        </TabsContent>
      </Tabs>
      <footer className="flex flex-col gap-1 border-t pt-4 text-xs text-muted-foreground">
        <p>
          Snapshot of {when(data.generatedAt)}. GitHub data is read with the maintainer's <span className="font-mono">gh</span> login
          (read only); routine runs come from the Claude app's scheduled tasks. Refreshes at {data.board.refreshTimes.join(" and ")}{" "}
          {data.board.timezone} while the Claude app is open.
        </p>
        {data.errors.length > 0 && <p className="text-warning">Missing this time: {data.errors.join("; ")}</p>}
      </footer>
    </>
  )
}

const statusMeta = {
  ok: { title: "All good", icon: CircleCheck, tone: "ok" as Tone, ring: "bg-success/10 text-success" },
  attention: { title: "Needs attention", icon: TriangleAlert, tone: "warn" as Tone, ring: "bg-warning/10 text-warning" },
  critical: { title: "Action needed now", icon: CircleX, tone: "bad" as Tone, ring: "bg-destructive/10 text-destructive" },
}

const levelTone: Record<string, Tone> = { critical: "bad", warn: "warn", info: "info" }
const levelLabel: Record<string, string> = { critical: "Critical", warn: "Warning", info: "Note" }

function StatusCard({ data }: { data: Snapshot }) {
  const meta = statusMeta[data.status]
  const Icon = meta.icon
  const counts = {
    critical: data.attention.filter((a) => a.level === "critical").length,
    warn: data.attention.filter((a) => a.level === "warn").length,
    info: data.attention.filter((a) => a.level === "info").length,
  }
  const summary = [
    counts.critical && plural(counts.critical, "critical item"),
    counts.warn && plural(counts.warn, "warning"),
    counts.info && plural(counts.info, "note"),
  ].filter(Boolean)

  return (
    <Card id="status">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", meta.ring)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <CardTitle className="text-lg">{meta.title}</CardTitle>
          <CardDescription>
            {summary.length ? summary.join(" · ") : "CI is green, routines run on schedule and nothing waits on you."}
          </CardDescription>
        </div>
      </CardHeader>
      {data.attention.length > 0 && (
        <CardContent className="pb-3">
          <ul className="divide-y">
            {data.attention.map((a, i) => (
              <li key={i} className="flex items-start gap-3 py-2">
                <StatusBadge tone={levelTone[a.level]} className="mt-0.5 w-[4.75rem] justify-center">
                  {levelLabel[a.level]}
                </StatusBadge>
                <div className="min-w-0 flex-1 text-sm">
                  <span className="text-muted-foreground">{a.area} · </span>
                  {a.text}
                </div>
                <OpenButton href={a.url} label={`Open: ${a.text}`} />
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  )
}

function Kpi({
  label,
  icon: Icon,
  value,
  sub,
  progress,
  tone,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  value: React.ReactNode
  sub: React.ReactNode
  progress?: number | null
  tone?: Tone
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
        <CardDescription className="text-xs font-medium">{label}</CardDescription>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 p-4 pt-0">
        <div
          className={cn(
            "text-2xl font-semibold tabular-nums tracking-tight",
            tone === "bad" && "text-destructive",
            tone === "warn" && "text-warning",
          )}
        >
          {value}
        </div>
        {progress != null && <Progress value={progress} className="h-1.5" />}
        <p className="text-xs leading-snug text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

function Kpis({ data }: { data: Snapshot }) {
  const you = data.prs.filter((p) => p.waitingWho === "you").length
  const routinePrs = data.prs.filter((p) => p.isRoutine).length
  const active = data.routines.filter((r) => r.enabled)
  const healthy = active.filter((r) => r.health === "ok" || r.health === "running").length
  const runs = data.routines.reduce((n, r) => n + r.runs7d.total, 0)
  const runsOk = data.routines.reduce((n, r) => n + r.runs7d.succeeded, 0)
  const e2e = data.e2e ? (data.e2e.main ?? data.e2e.latest) : null
  const e2ePass = e2e?.jobs.filter((j) => j.conclusion === "success").length ?? 0
  const e2eRunning = e2e?.jobs.some((j) => j.status !== "completed")
  const branch = data.board.defaultBranch

  return (
    <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3", data.e2e ? "xl:grid-cols-6" : "xl:grid-cols-5")}>
      <Kpi
        label="Open pull requests"
        icon={GitPullRequest}
        value={data.prs.length}
        sub={`${you} wait on you · ${routinePrs} from routines`}
        tone={you ? "warn" : undefined}
      />
      <Kpi
        label="Open issues"
        icon={CircleDot}
        value={data.issues.open}
        sub={`${data.issues.byType.bug ?? 0} bugs · ${data.issues.byPriority.high ?? 0} high priority`}
      />
      <Kpi
        label="CI pass rate, 7 days"
        icon={Workflow}
        value={data.ci.passRate7d == null ? "—" : `${data.ci.passRate7d}%`}
        progress={data.ci.passRate7d}
        sub={`${plural(data.ci.failures7d, "failure")} in ${data.ci.runs7d} runs`}
        tone={data.ci.passRate7d != null && data.ci.passRate7d < 80 ? "bad" : undefined}
      />
      {data.e2e && (
        <Kpi
          label="End-to-end tests"
          icon={FlaskConical}
          value={e2e ? `${e2ePass}/${e2e.jobs.length}` : "—"}
          sub={
            e2e
              ? `${e2eRunning ? "running · " : ""}systems pass on ${data.e2e.main ? branch : e2e.branch}`
              : "No run in the last 30 days"
          }
          tone={e2e && !e2eRunning && e2ePass < e2e.jobs.length ? "bad" : undefined}
        />
      )}
      <Kpi
        label="Routines healthy"
        icon={Bot}
        value={`${healthy}/${active.length}`}
        sub={`${runsOk}/${runs} runs succeeded, 7 days`}
        tone={healthy < active.length ? "warn" : undefined}
      />
      <Kpi
        label="Latest release"
        icon={Tag}
        value={<span className="font-mono">{data.repo.release.tag ?? "—"}</span>}
        sub={`${plural(data.repo.unreleasedChanges, "unreleased change")} · ${
          data.repo.release.daysAgo != null ? `${data.repo.release.daysAgo} d old` : "no release"
        }`}
      />
    </div>
  )
}

function LoadingView() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading the latest snapshot">
      <Skeleton className="h-28 w-full" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-9 w-80 max-w-full" />
      <Skeleton className="h-72 w-full" />
      <p className="text-xs text-muted-foreground">Loading the latest snapshot…</p>
    </div>
  )
}

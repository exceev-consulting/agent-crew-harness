import { useMemo, useRef, useState } from "react"
import { ArrowUpRight, CircleCheck, CircleDashed, CircleMinus, CircleX } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Empty, ExtLink, StatusBadge, type Tone } from "@/components/status"
import { rel, secs, when } from "@/lib/format"
import type { Board, TestCell, TestRow, TestRun, TestRunDetail, Tests } from "@/lib/types"
import { cn } from "@/lib/utils"
import { TestAnalytics } from "@/sections/test-analytics"

/* ------------------------------------------------------------------ shared bits */

const seqWord: Record<string, string> = { P: "passed", F: "failed", S: "skipped", "-": "no result" }
const statusTone: Record<string, Tone> = { passed: "ok", failed: "bad", skipped: "neutral", missing: "warn", running: "running" }

const squareClass: Record<string, string> = {
  P: "bg-success",
  F: "bg-destructive",
  S: "bg-muted-foreground/30",
  "-": "border border-dashed border-muted-foreground/40 bg-transparent",
}

function Square({ code, label }: { code: string; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} aria-label={label} className={cn("inline-block h-3.5 w-3.5 shrink-0 rounded-[3px]", squareClass[code] ?? squareClass["-"])} />
      </TooltipTrigger>
      <TooltipContent className="text-xs">{label}</TooltipContent>
    </Tooltip>
  )
}

function SeqSquares({ seq, labels }: { seq: string; labels: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {seq.split("").map((c, i) => (
        <Square key={i} code={c} label={`${labels[i] ?? `run ${i + 1}`}: ${seqWord[c] ?? c}`} />
      ))}
    </div>
  )
}

function StatusIcon({ status, className }: { status?: string; className?: string }) {
  if (status === "passed") return <CircleCheck className={cn("h-4 w-4 text-success", className)} />
  if (status === "failed") return <CircleX className={cn("h-4 w-4 text-destructive", className)} />
  if (status === "skipped") return <CircleMinus className={cn("h-4 w-4 text-muted-foreground", className)} />
  return <CircleDashed className={cn("h-4 w-4 text-muted-foreground", className)} />
}

function Counts({ c }: { c: TestRun["counts"] }) {
  if (!c) return <span className="text-muted-foreground">—</span>
  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap tabular-nums">
      <span className="inline-flex items-center gap-1 text-success">
        <CircleCheck className="h-3.5 w-3.5" />
        {c.passed}
      </span>
      <span className={cn("inline-flex items-center gap-1", c.failed ? "text-destructive" : "text-muted-foreground")}>
        <CircleX className="h-3.5 w-3.5" />
        {c.failed}
      </span>
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <CircleMinus className="h-3.5 w-3.5" />
        {c.skipped}
      </span>
    </span>
  )
}

function MiniKpi({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub: string; tone?: Tone }) {
  return (
    <Card>
      <CardHeader className="p-4 pb-1">
        <CardDescription className="text-xs font-medium">{label}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 p-4 pt-0">
        <div
          className={cn(
            "text-2xl font-semibold tabular-nums tracking-tight",
            tone === "bad" && "text-destructive",
            tone === "warn" && "text-warning",
            tone === "ok" && "text-success",
          )}
        >
          {value}
        </div>
        <p className="text-xs leading-snug text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ the tab */

type Selected = { scenario: string; os: string } | null

export function TestsTab({ tests, generatedAt, board }: { tests?: Tests; generatedAt: string; board: Board }) {
  const branch = board.defaultBranch
  const [selected, setSelected] = useState<Selected>(null)
  const [which, setWhich] = useState<"latest" | "main">("latest")
  const [view, setView] = useState(() => (window.location.hash === "#tests/analytics" ? "analytics" : "results"))

  if (!tests) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">No test data yet</CardTitle>
          <CardDescription>The next refresh collects the test results.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const detail = which === "main" && tests.main ? tests.main : tests.latest
  const latestE2e = tests.runs.find((r) => r.kind === "e2e" && r.status !== "running")
  const lastChecks = tests.checks.filter((c) => c.last !== "-")
  const checksOk = lastChecks.filter((c) => c.last === "P").length
  const hasStages = Boolean(detail?.oses.some((o) => (o.audit && Object.keys(o.audit).length) || o.secondRun?.length))

  return (
    <div className="flex flex-col gap-4">
      <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3", tests.checksName ? "xl:grid-cols-6" : "xl:grid-cols-5")}>
        <MiniKpi
          label="Latest end-to-end run"
          value={latestE2e ? latestE2e.status : "—"}
          sub={latestE2e ? `${latestE2e.branch} · ${rel(latestE2e.createdAt)}` : "No finished run in the window"}
          tone={latestE2e ? (latestE2e.status === "passed" ? "ok" : "bad") : undefined}
        />
        <MiniKpi
          label={`Pass rate, ${tests.windowDays} days`}
          value={tests.passRate == null ? "—" : `${tests.passRate}%`}
          sub={`${tests.e2eRunIds.length} ${tests.name} runs · ${tests.osOrder.length} systems`}
        />
        <MiniKpi
          label="New failures"
          value={tests.health.regressions.length}
          sub="Passed in the previous run, fail now"
          tone={tests.health.regressions.length ? "bad" : "ok"}
        />
        <MiniKpi
          label="Failing tests"
          value={tests.health.failing.length}
          sub="Fail in the latest run, not new"
          tone={tests.health.failing.length ? "warn" : "ok"}
        />
        <MiniKpi
          label="Flaky tests"
          value={tests.health.flaky.length}
          sub="Pass and fail without a code change"
          tone={tests.health.flaky.length ? "warn" : "ok"}
        />
        {tests.checksName && (
          <MiniKpi
            label={`${tests.checksName} steps`}
            value={`${checksOk}/${lastChecks.length}`}
            sub={`passing in the latest of ${tests.checkRuns} runs`}
            tone={checksOk < lastChecks.length ? "bad" : "ok"}
          />
        )}
      </div>

      <Tabs value={view} onValueChange={setView} className="flex flex-col gap-4">
        <TabsList className="self-start">
          <TabsTrigger value="results" id="tests-results">Runs &amp; results</TabsTrigger>
          <TabsTrigger value="analytics" id="tests-analytics">Analytics &amp; history</TabsTrigger>
        </TabsList>
        <TabsContent value="analytics" className="mt-0">
          <TestAnalytics tests={tests} generatedAt={generatedAt} timeZone={board.timezone} branch={branch} />
        </TabsContent>
        <TabsContent value="results" className="mt-0">
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 xl:grid-cols-3">
              <RunsCard runs={tests.runs} tests={tests} branch={branch} />
              <HealthCard tests={tests} />
            </div>

            <Card className="min-w-0">
              <CardHeader className="flex flex-col gap-3 space-y-0 pb-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-base">End-to-end results by system</CardTitle>
                  <CardDescription>
                    {detail ? (
                      <>
                        {detail.title} · <span className="font-mono">{detail.branch}</span> @{" "}
                        <span className="font-mono">{detail.sha}</span> · {when(detail.createdAt)}. Select a result for its assertions.
                      </>
                    ) : (
                      "No finished end-to-end run in the window."
                    )}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {tests.main && (
                    <ToggleGroup type="single" value={which} onValueChange={(v) => v && setWhich(v as "latest" | "main")} variant="outline" size="sm">
                      <ToggleGroupItem value="latest" id="matrix-latest">Latest run</ToggleGroupItem>
                      <ToggleGroupItem value="main" id="matrix-main">{branch}</ToggleGroupItem>
                    </ToggleGroup>
                  )}
                  {detail && (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <a href={detail.url} target="_blank" rel="noreferrer">
                          Run <ArrowUpRight className="h-4 w-4" />
                        </a>
                      </Button>
                      {detail.reportUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={detail.reportUrl} target="_blank" rel="noreferrer">
                            HTML report <ArrowUpRight className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-2 sm:px-6">
                {detail ? <Matrix tests={tests} detail={detail} onSelect={setSelected} /> : <Empty>Nothing to show yet.</Empty>}
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-3">
              <HistoryCard tests={tests} onSelect={setSelected} />
              <TopFailuresCard tests={tests} />
            </div>

            {(hasStages || tests.checksName) && (
              <div className="grid gap-4 xl:grid-cols-3">
                {hasStages && <AuditCard detail={detail} />}
                {tests.checksName && <ChecksCard tests={tests} wide={!hasStages} />}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <CellSheet tests={tests} detail={detail} selected={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

/* ------------------------------------------------------------------ runs */

function RunsCard({ runs, tests, branch }: { runs: TestRun[]; tests: Tests; branch: string }) {
  const [filter, setFilter] = useState<"all" | "e2e" | "checks" | "main">("all")
  const shown = runs.filter((r) => (filter === "all" ? true : filter === "main" ? r.branch === branch : r.kind === filter)).slice(0, 15)

  return (
    <Card className="min-w-0 xl:col-span-2">
      <CardHeader className="flex flex-col gap-3 space-y-0 pb-3 md:flex-row md:items-end md:justify-between">
        <div>
          <CardTitle className="text-base">Test runs</CardTitle>
          <CardDescription>
            End-to-end runs{tests.checksName ? ` and the ${tests.checksName} workflow's steps` : ""}, newest first
          </CardDescription>
        </div>
        <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v as typeof filter)} variant="outline" size="sm" className="flex-wrap justify-start">
          <ToggleGroupItem value="all" id="runs-all">All</ToggleGroupItem>
          <ToggleGroupItem value="e2e" id="runs-e2e">End-to-end</ToggleGroupItem>
          {tests.checksName && (
            <ToggleGroupItem value="checks" id="runs-checks">
              {tests.checksName}
            </ToggleGroupItem>
          )}
          <ToggleGroupItem value="main" id="runs-main">{branch}</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="px-0 pb-2 sm:px-6">
        {shown.length === 0 ? (
          <Empty>No run in this view.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead className="min-w-[15rem]">Run</TableHead>
                <TableHead>Results</TableHead>
                <TableHead>New failures</TableHead>
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r) => (
                <TableRow key={`${r.kind}-${r.runId}`}>
                  <TableCell className="align-top">
                    <StatusBadge tone={statusTone[r.status]}>{r.status}</StatusBadge>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-0.5">
                      <ExtLink href={r.url} className="line-clamp-1 font-medium">
                        {r.title}
                      </ExtLink>
                      <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                        <Badge variant="outline" className="px-1.5 py-0 font-normal">
                          {r.kind === "e2e" ? tests.name : tests.checksName}
                        </Badge>
                        <span className="font-mono">{r.branch}</span>
                        {r.pr ? <span>#{r.pr}</span> : null}
                        <span className="font-mono">{r.sha}</span>
                        <span>· {rel(r.createdAt)}</span>
                        {r.reportUrl && (
                          <ExtLink href={r.reportUrl} className="underline">
                            report
                          </ExtLink>
                        )}
                      </span>
                      {r.oses && r.oses.length > 0 && (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {r.oses.map((o) => (
                            <StatusBadge key={o.os} tone={statusTone[o.status] ?? "neutral"} className="px-1.5 py-0 font-mono text-[10px]">
                              {o.os}
                            </StatusBadge>
                          ))}
                        </span>
                      )}
                      {r.failedSteps && r.failedSteps.length > 0 && (
                        <span className="text-xs text-destructive">Failed: {r.failedSteps.join(", ")}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <Counts c={r.counts} />
                  </TableCell>
                  <TableCell className="align-top">
                    {r.kind !== "e2e" || r.status === "running" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : r.newFailureCount ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0}>
                            <StatusBadge tone="bad">{r.newFailureCount} new</StatusBadge>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">{r.newFailures?.join(", ")}</TooltipContent>
                      </Tooltip>
                    ) : r.baseline == null ? (
                      <span className="text-xs text-muted-foreground">first run</span>
                    ) : (
                      <StatusBadge tone="ok">none</StatusBadge>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right align-top tabular-nums text-muted-foreground">
                    {r.status === "running" ? "running" : secs(r.durationS)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ health */

type HealthKey = keyof Tests["health"]
const healthMeta: { key: HealthKey; label: string; hint: string; empty: string }[] = [
  { key: "regressions", label: "New failures", hint: "Passed in the run before on the same branch (or the default branch), fail now.", empty: "No new failure." },
  { key: "failing", label: "Failing", hint: "Fail in the latest run and were not passing just before.", empty: "Nothing failing." },
  { key: "flaky", label: "Flaky", hint: "Both passed and failed on the same commit, or flipped twice or more.", empty: "No flaky test." },
  { key: "fixed", label: "Fixed", hint: "Failed in the run before, pass now.", empty: "Nothing newly fixed." },
]

function HealthCard({ tests }: { tests: Tests }) {
  const first = healthMeta.find((h) => tests.health[h.key].length)?.key ?? "regressions"
  const [key, setKey] = useState<HealthKey>(first)
  const meta = healthMeta.find((h) => h.key === key)!
  const items = tests.health[key]

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-col gap-3 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Test health</CardTitle>
          <CardDescription>{meta.hint}</CardDescription>
        </div>
        <ToggleGroup type="single" value={key} onValueChange={(v) => v && setKey(v as HealthKey)} variant="outline" size="sm" className="flex-wrap justify-start">
          {healthMeta.map((h) => (
            <ToggleGroupItem key={h.key} value={h.key} id={`health-${h.key}`}>
              {h.label} {tests.health[h.key].length}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <Empty>{meta.empty}</Empty>
        ) : (
          <ul className="divide-y">
            {items.map((it) => (
              <li key={`${it.scenario}-${it.os}`} className="flex flex-col gap-1.5 py-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{it.title}</span>
                  <Badge variant="secondary" className="font-mono text-[11px] font-normal">
                    {it.os}
                  </Badge>
                </div>
                <SeqSquares seq={it.seq} labels={tests.e2eRunLabels} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ matrix */

function Matrix({ tests, detail, onSelect }: { tests: Tests; detail: TestRunDetail; onSelect: (s: Selected) => void }) {
  const oses = tests.osOrder.filter((o) => detail.oses.some((d) => d.os === o))
  const byOs = Object.fromEntries(detail.oses.map((o) => [o.os, o]))
  const groups = useMemo(() => {
    const out: { group: string; items: Tests["scenarios"] }[] = []
    for (const s of tests.scenarios) {
      const last = out[out.length - 1]
      if (last && last.group === s.group) last.items.push(s)
      else out.push({ group: s.group, items: [s] })
    }
    return out
  }, [tests.scenarios])

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[16rem]">Scenario</TableHead>
          {oses.map((o) => (
            <TableHead key={o} className="min-w-[7.5rem] text-center">
              <div className="flex flex-col items-center gap-1 py-1">
                <span className="font-mono text-xs text-foreground">{o}</span>
                {byOs[o]?.status === "missing" ? (
                  <StatusBadge tone="warn" className="px-1.5 py-0 text-[10px]">no results</StatusBadge>
                ) : (
                  <span className="text-[11px] font-normal tabular-nums">
                    {byOs[o]?.counts.passed}/{(byOs[o]?.counts.passed ?? 0) + (byOs[o]?.counts.failed ?? 0) + (byOs[o]?.counts.skipped ?? 0)} ·{" "}
                    {secs(byOs[o]?.durationS)}
                  </span>
                )}
              </div>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((g) => [
          <TableRow key={`g-${g.group}`} className="bg-muted/40 hover:bg-muted/40">
            <TableCell colSpan={oses.length + 1} className="py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {g.group}
            </TableCell>
          </TableRow>,
          ...g.items.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="py-2">
                <div className="flex flex-col">
                  <span className="leading-snug">{s.title}</span>
                  <span className="font-mono text-xs text-muted-foreground">{s.id}</span>
                </div>
              </TableCell>
              {oses.map((o) => {
                const cell = detail.cells[`${s.id}|${o}`]
                return (
                  <TableCell key={o} className="py-1.5 text-center">
                    {cell ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 px-2 tabular-nums"
                        onClick={() => onSelect({ scenario: s.id, os: o })}
                        aria-label={`${s.title} on ${o}: ${cell.status}`}
                      >
                        <StatusIcon status={cell.status} />
                        <span className="text-xs text-muted-foreground">{cell.status === "skipped" ? "skipped" : secs(cell.durationS)}</span>
                      </Button>
                    ) : (
                      <span className="inline-flex h-8 items-center">
                        <StatusIcon status="none" />
                      </span>
                    )}
                  </TableCell>
                )
              })}
            </TableRow>
          )),
        ])}
      </TableBody>
    </Table>
  )
}

/* ------------------------------------------------------------------ cell details */

function CellSheet({
  tests,
  detail,
  selected,
  onClose,
}: {
  tests: Tests
  detail: TestRunDetail | null
  selected: Selected
  onClose: () => void
}) {
  // keep showing the last selection while the sheet slides closed
  const last = useRef<Selected>(null)
  if (selected) last.current = selected
  const shown = selected ?? last.current
  const cell: TestCell | undefined = shown && detail ? detail.cells[`${shown.scenario}|${shown.os}`] : undefined
  const scenario = tests.scenarios.find((s) => s.id === shown?.scenario)
  const row = tests.rows.find((r) => r.scenario === shown?.scenario && r.os === shown?.os)
  const failed = cell?.assertions.filter((a) => !a.ok) ?? []
  const passed = cell?.assertions.filter((a) => a.ok) ?? []

  return (
    <Sheet open={!!selected} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="pr-6">{scenario?.title ?? shown?.scenario}</SheetTitle>
          <SheetDescription>
            <span className="font-mono">{shown?.os}</span> · <span className="font-mono">{shown?.scenario}</span>
            {detail ? ` · run of ${when(detail.createdAt)}` : ""}
          </SheetDescription>
        </SheetHeader>
        {cell && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge tone={statusTone[cell.status]}>{cell.status}</StatusBadge>
            <span className="text-muted-foreground">{secs(cell.durationS)}</span>
            {row?.passRate != null && <span className="text-muted-foreground">· {row.passRate}% pass rate over the window</span>}
          </div>
        )}
        {cell?.reason && <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{cell.reason}</p>}
        {row && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">History on {row.os}</p>
            <SeqSquares seq={row.seq} labels={tests.e2eRunLabels} />
            {row.durs && row.durs.some((d) => d != null) && <DurationHistory row={row} labels={tests.e2eRunLabels} />}
          </div>
        )}
        <Separator />
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Assertions · {passed.length} passed{failed.length ? ` · ${failed.length} failed` : ""}
          </p>
          {cell && cell.assertions.length === 0 && <Empty>No assertion recorded (the scenario was skipped).</Empty>}
          <ul className="flex flex-col gap-2">
            {[...failed, ...passed].map((a, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <StatusIcon status={a.ok ? "passed" : "failed"} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="leading-snug">{a.name}</p>
                  {a.detail && <p className="break-words font-mono text-xs text-muted-foreground">{a.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
        {detail && (
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" asChild>
              <a href={detail.url} target="_blank" rel="noreferrer">
                Open the run <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
            {detail.reportUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={detail.reportUrl} target="_blank" rel="noreferrer">
                  Logs in the HTML report <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

const durConfig = { seconds: { label: "Seconds", color: "hsl(var(--muted-foreground))" } } satisfies ChartConfig
const barFill: Record<string, string> = { P: "hsl(var(--success))", F: "hsl(var(--destructive))", S: "hsl(var(--muted-foreground) / 0.45)" }

/** Duration of one scenario on one system, run by run, each bar coloured by that run's result. */
function DurationHistory({ row, labels }: { row: TestRow; labels: string[] }) {
  const data = (row.durs ?? []).map((d, i) => ({ label: labels[i] ?? `run ${i + 1}`, seconds: d, code: row.seq[i] ?? "-" }))
  return (
    <ChartContainer config={durConfig} className="aspect-auto h-[140px] w-full">
      <BarChart data={data} margin={{ left: 0, right: 4, top: 8 }} maxBarSize={24}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} minTickGap={16} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="seconds" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={barFill[d.code] ?? "hsl(var(--muted-foreground) / 0.45)"} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

/* ------------------------------------------------------------------ history heatmap */

function HistoryCard({ tests, onSelect }: { tests: Tests; onSelect: (s: Selected) => void }) {
  const [os, setOs] = useState<string>("all")
  const scenarioRows = tests.scenarios.map((s) => {
    const rows = tests.rows.filter((r) => r.scenario === s.id && (os === "all" || r.os === os))
    const n = tests.e2eRunIds.length
    let seq = ""
    for (let i = 0; i < n; i++) {
      const codes = rows.map((r) => r.seq[i] ?? "-")
      seq += codes.includes("F") ? "F" : codes.includes("P") ? "P" : codes.includes("S") ? "S" : "-"
    }
    const known = rows.flatMap((r) => r.seq.split("")).filter((c) => c === "P" || c === "F")
    const rate = known.length ? Math.round((100 * known.filter((c) => c === "P").length) / known.length) : null
    return { ...s, seq, rate }
  })

  return (
    <Card className="min-w-0 xl:col-span-2">
      <CardHeader className="flex flex-col gap-3 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Test history</CardTitle>
          <CardDescription>
            Each square is one end-to-end run, oldest on the left. With all systems, a square is red when any system failed.
          </CardDescription>
        </div>
        <ToggleGroup type="single" value={os} onValueChange={(v) => v && setOs(v)} variant="outline" size="sm" className="flex-wrap justify-start">
          <ToggleGroupItem value="all" id="history-all">All systems</ToggleGroupItem>
          {tests.osOrder.map((o) => (
            <ToggleGroupItem key={o} value={o} id={`history-${o}`} className="font-mono text-xs">
              {o}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardHeader>
      <CardContent className="px-0 pb-2 sm:px-6">
        {tests.e2eRunIds.length === 0 ? (
          <Empty>No finished end-to-end run yet.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[14rem]">Scenario</TableHead>
                <TableHead>Runs ({tests.e2eRunIds.length})</TableHead>
                <TableHead className="text-right">Pass rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarioRows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="py-2">
                    {os === "all" ? (
                      <span className="leading-snug">{s.title}</span>
                    ) : (
                      <button
                        type="button"
                        className="text-left leading-snug underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                        onClick={() => onSelect({ scenario: s.id, os })}
                      >
                        {s.title}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <SeqSquares seq={s.seq} labels={tests.e2eRunLabels} />
                  </TableCell>
                  <TableCell className="py-2 text-right tabular-nums">{s.rate == null ? "—" : `${s.rate}%`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex flex-wrap items-center gap-3 px-4 pt-3 text-xs text-muted-foreground sm:px-0">
          {(["P", "F", "S", "-"] as const).map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5">
              <span className={cn("inline-block h-3 w-3 rounded-[3px]", squareClass[c])} />
              {seqWord[c]}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ top failures */

function TopFailuresCard({ tests }: { tests: Tests }) {
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Most common failures</CardTitle>
        <CardDescription>Failed assertions across the last {tests.e2eRunIds.length} end-to-end runs</CardDescription>
      </CardHeader>
      <CardContent>
        {tests.topFailures.length === 0 ? (
          <Empty>No failure in the window.</Empty>
        ) : (
          <ul className="divide-y">
            {tests.topFailures.map((f, i) => (
              <li key={i} className="flex gap-3 py-2.5">
                <Badge variant="outline" className={cn("h-6 shrink-0 justify-center px-2 tabular-nums", f.count > 1 && "border-destructive/30 text-destructive")}>
                  ×{f.count}
                </Badge>
                <div className="flex min-w-0 flex-col gap-1 text-sm">
                  <span className="leading-snug">{f.message}</span>
                  {f.detail && <span className="break-words font-mono text-xs text-muted-foreground">{f.detail}</span>}
                  <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    <span className="font-mono">{f.scenario}</span>
                    {f.oses.map((o) => (
                      <Badge key={o} variant="secondary" className="px-1.5 py-0 font-mono text-[10px] font-normal">
                        {o}
                      </Badge>
                    ))}
                    <span>· {rel(f.lastAt)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ audit + checks */

function scoreTone(score: number | null | undefined): Tone {
  if (score == null) return "neutral"
  return score >= 95 ? "ok" : score >= 80 ? "warn" : "bad"
}

/** Stage scores (the results file's optional "audit" block) and what a second run changed (its "steps" block). */
function AuditCard({ detail }: { detail: TestRunDetail | null }) {
  const stages: string[] = []
  for (const o of detail?.oses ?? []) for (const k of Object.keys(o.audit ?? {})) if (!stages.includes(k)) stages.push(k)
  return (
    <Card className="min-w-0 xl:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Scores by stage</CardTitle>
        <CardDescription>
          The score each system reported at each stage of the run, plus what a second run changed (it should change nothing)
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-2 sm:px-6">
        {!detail ? (
          <Empty>No finished run yet.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>System</TableHead>
                {stages.map((stage) => (
                  <TableHead key={stage} className="capitalize">
                    {stage}
                  </TableHead>
                ))}
                <TableHead className="min-w-[12rem]">Second run</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.oses.map((o) => (
                <TableRow key={o.os}>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs">{o.os}</span>
                      <span className="text-xs text-muted-foreground">
                        {o.accel ? `${o.accel}` : ""}
                        {o.kernel ? ` · ${o.kernel}` : ""}
                      </span>
                    </div>
                  </TableCell>
                  {stages.map((stage, i) => {
                    const a = o.audit?.[stage]
                    return (
                      <TableCell key={stage} className="whitespace-nowrap">
                        {a ? (
                          <div className="flex flex-col items-start gap-0.5">
                            <StatusBadge tone={i === 0 && stages.length > 1 ? "neutral" : scoreTone(a.score)}>{a.score ?? "—"}</StatusBadge>
                            <span className="text-[11px] tabular-nums text-muted-foreground">
                              {a.fail ?? 0} fail · {a.warn ?? 0} warn
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-sm">
                    {o.status === "missing" ? (
                      <span className="text-warning">{o.reason}</span>
                    ) : o.secondRun && o.secondRun.length ? (
                      <span className="text-destructive">{o.secondRun.join("; ")}</span>
                    ) : (
                      <StatusBadge tone="ok">nothing changed</StatusBadge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function ChecksCard({ tests, wide }: { tests: Tests; wide?: boolean }) {
  const labels = tests.checkRunLabels ?? []
  return (
    <Card className={cn("min-w-0", wide && "xl:col-span-3")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{tests.checksName} workflow steps</CardTitle>
        <CardDescription>Each step of the {tests.checksName} workflow over the last {Math.min(20, tests.checkRuns)} runs</CardDescription>
      </CardHeader>
      <CardContent>
        {tests.checks.length === 0 ? (
          <Empty>No {tests.checksName} run yet.</Empty>
        ) : (
          <ul className="divide-y">
            {tests.checks.map((c) => (
              <li key={c.name} className="flex flex-col gap-1.5 py-2.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{c.passRate == null ? "—" : `${c.passRate}%`}</span>
                </div>
                <div className="overflow-x-auto">
                  <SeqSquares seq={c.seq} labels={labels} />
                </div>
                {c.lastFailure && (
                  <span className="text-xs text-muted-foreground">
                    Last failure{" "}
                    <ExtLink href={c.lastFailure.url} className="underline">
                      {rel(c.lastFailure.at)}
                    </ExtLink>{" "}
                    on <span className="font-mono">{c.lastFailure.branch}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}


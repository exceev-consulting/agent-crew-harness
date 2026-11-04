import { useMemo, useState } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Empty, ExtLink, StatusBadge } from "@/components/status"
import { day, secs } from "@/lib/format"
import type { RunLogItem, Tests, TrendRun } from "@/lib/types"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ helpers */

type Range = "7" | "14" | "30"

// Days and times in the board's timezone and its default branch: set by TestAnalytics before its charts render.
let zone = "UTC"
let mainBranch = "main"
let zoneDay = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" })
let zoneStamp = new Intl.DateTimeFormat(undefined, { timeZone: zone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
const dayOf = (iso: string) => zoneDay.format(new Date(iso))

function configure(timeZone: string, branch: string) {
  mainBranch = branch
  if (timeZone === zone) return
  try {
    zoneDay = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    zoneStamp = new Intl.DateTimeFormat(undefined, { timeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    zone = timeZone
  } catch {
    /* unknown zone: keep the previous one */
  }
}

function branchOk(b: string | null | undefined, f: string) {
  if (f === "all") return true
  if (f === "main") return b === mainBranch
  if (f === "prs") return !!b && b !== mainBranch
  return b === f.slice(2)
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const minutes = (s: number | null | undefined) => (s == null ? null : Math.round(s / 6) / 10)

/** recharts data keys become CSS variables: keep them to [a-z0-9_] */
const osKey = (os: string) => os.replace(/[^a-zA-Z0-9]/g, "_")
// colour follows the system, by its place in osOrder (validated 5-slot palette); a 6th system folds into grey
const osColor = (i: number) => (i < 5 ? `hsl(var(--chart-${i + 1}))` : "hsl(var(--muted-foreground))")

function withBranch(label: unknown, payload: ReadonlyArray<{ payload?: Record<string, unknown> }>) {
  const b = payload?.[0]?.payload?.branch
  return b ? `${label} · ${b}` : String(label)
}

const statusConfig = {
  passed: { label: "Passed", color: "hsl(var(--success))" },
  failed: { label: "Failed", color: "hsl(var(--destructive))" },
  cancelled: { label: "Cancelled", color: "hsl(var(--muted-foreground) / 0.45)" },
  skipped: { label: "Skipped", color: "hsl(var(--muted-foreground) / 0.45)" },
} satisfies ChartConfig

function ChartCard({
  title,
  description,
  className,
  empty,
  children,
}: {
  title: string
  description: React.ReactNode
  className?: string
  empty?: string | false
  children: React.ReactNode
}) {
  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{empty ? <Empty>{empty}</Empty> : children}</CardContent>
    </Card>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub: string; tone?: "ok" | "bad" | "warn" }) {
  return (
    <Card>
      <CardHeader className="p-4 pb-1">
        <CardDescription className="text-xs font-medium">{label}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 p-4 pt-0">
        <div
          className={cn(
            "text-2xl font-semibold tracking-tight",
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

const axisX = { tickLine: false, axisLine: false, tickMargin: 8, minTickGap: 16 } as const
// line and area charts: room for the first and last labels
const axisXLine = { ...axisX, padding: { left: 28, right: 28 } } as const
// 2px surface gap between stacked segments
const gap = { stroke: "hsl(var(--card))", strokeWidth: 2 } as const
const axisY = { tickLine: false, axisLine: false, width: 36 } as const
const dotFor = (color: string) => ({ r: 4, fill: color, stroke: "hsl(var(--card))", strokeWidth: 2 })

/* ------------------------------------------------------------------ the view */

export function TestAnalytics({
  tests,
  generatedAt,
  timeZone,
  branch: defaultBranch,
}: {
  tests: Tests
  generatedAt: string
  timeZone: string
  branch: string
}) {
  configure(timeZone, defaultBranch)
  const checksName = tests.checksName
  const [range, setRange] = useState<Range>("30")
  const [branch, setBranch] = useState("all")
  const log = useMemo(() => tests.runLog ?? [], [tests.runLog])

  // branches seen in the window, most recent first
  const branches = useMemo(() => {
    const last = new Map<string, string>()
    for (const r of log) if (r.b && r.b !== defaultBranch && (last.get(r.b) ?? "") < r.at) last.set(r.b, r.at)
    for (const r of tests.trend) if (r.branch && r.branch !== defaultBranch && r.at && (last.get(r.branch) ?? "") < r.at) last.set(r.branch, r.at)
    return [...last.entries()].sort((a, b) => b[1].localeCompare(a[1])).slice(0, 20).map(([b]) => b)
  }, [log, tests.trend, defaultBranch])

  const days = useMemo(() => {
    const end = new Date(generatedAt).getTime()
    const out = new Set<string>()
    for (let i = Number(range) - 1; i >= 0; i--) out.add(dayOf(new Date(end - i * 86400000).toISOString()))
    return [...out]
  }, [generatedAt, range])

  const from = days[0]
  const logView = log.filter((r) => dayOf(r.at) >= from && branchOk(r.b, branch))
  const runs = tests.trend.filter((r) => (!r.at || dayOf(r.at) >= from) && branchOk(r.branch, branch))
  const runIndex = useMemo(() => new Map(tests.e2eRunIds.map((id, i) => [id, i])), [tests.e2eRunIds])

  const finished = logView.filter((r) => r.c === "passed" || r.c === "failed")
  const runPass = finished.length ? Math.round((100 * finished.filter((r) => r.c === "passed").length) / finished.length) : null
  const e2eAvg = avg(finished.filter((r) => r.k === "e2e" && r.d != null).map((r) => r.d!))
  const checksAvg = avg(finished.filter((r) => r.k === "checks" && r.d != null).map((r) => r.d!))
  const checksCount = logView.filter((r) => r.k === "checks").length
  const passed = sum(runs.map((r) => r.passed))
  const failed = sum(runs.map((r) => r.failed))
  const testPass = passed + failed ? Math.round((100 * passed) / (passed + failed)) : null
  const newFailures = sum(runs.map((r) => r.newFailures ?? 0))
  const fixed = sum(runs.map((r) => r.fixed ?? 0))
  const branchLabel = branch === "all" ? "all branches" : branch === "main" ? defaultBranch : branch === "prs" ? "pull request branches" : branch.slice(2)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <ToggleGroup type="single" value={range} onValueChange={(v) => v && setRange(v as Range)} variant="outline" size="sm" className="justify-start">
          <ToggleGroupItem value="7" id="range-7">Last 7 days</ToggleGroupItem>
          <ToggleGroupItem value="14" id="range-14">14 days</ToggleGroupItem>
          <ToggleGroupItem value="30" id="range-30">30 days</ToggleGroupItem>
        </ToggleGroup>
        <Select value={branch} onValueChange={setBranch}>
          <SelectTrigger className="h-9 w-full sm:w-[260px]" aria-label="Branch">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            <SelectItem value="main">{defaultBranch} only</SelectItem>
            <SelectItem value="prs">Pull request branches</SelectItem>
            {branches.length > 0 && (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Branches</SelectLabel>
                  {branches.map((b) => (
                    <SelectItem key={b} value={`b:${b}`} className="font-mono text-xs">
                      {b}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </>
            )}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground sm:ml-auto">
          {runs.length} end-to-end{checksName ? ` · ${checksCount} ${checksName}` : ""} runs on {branchLabel}, since {day(from)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Runs" value={logView.length} sub={`${logView.filter((r) => r.k === "e2e").length} end-to-end${checksName ? ` · ${checksCount} ${checksName}` : ""}`} />
        <Stat
          label="Run pass rate"
          value={runPass == null ? "—" : `${runPass}%`}
          sub={`${finished.filter((r) => r.c === "failed").length} failed of ${finished.length} finished runs`}
          tone={runPass == null ? undefined : runPass >= 90 ? "ok" : runPass >= 70 ? "warn" : "bad"}
        />
        <Stat label="Test pass rate" value={testPass == null ? "—" : `${testPass}%`} sub={`${passed} passed · ${failed} failed scenario results`} />
        <Stat
          label="Average run time"
          value={e2eAvg == null ? "—" : secs(Math.round(e2eAvg))}
          sub={`end-to-end${checksName ? ` · ${checksName} ${checksAvg == null ? "—" : secs(Math.round(checksAvg))}` : ""}`}
        />
        <Stat
          label="New failures"
          value={newFailures}
          sub={`${fixed} fixed in the same runs`}
          tone={newFailures ? "bad" : "ok"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <RunsPerDay title="End-to-end runs per day" kind="e2e" days={days} log={logView} label="end-to-end" />
        {checksName && (
          <>
            <RunsPerDay title={`${checksName} runs per day`} kind="checks" days={days} log={logView} label={checksName} />
            <ChecksDuration log={logView} name={checksName} />
          </>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ResultsPerRun runs={runs} />
        <PassRate runs={runs} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <DurationBySystem runs={runs} osOrder={tests.osOrder} />
        <RunDuration runs={runs} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <FailuresBySystem runs={runs} osOrder={tests.osOrder} />
        <Changes runs={runs} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ScenarioDuration tests={tests} runs={runs} runIndex={runIndex} />
        <Slowest tests={tests} runs={runs} runIndex={runIndex} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SuiteSize runs={runs} />
        <RunsTable runs={runs} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ run-level charts */

function RunsPerDay({ title, kind, days, log, label }: { title: string; kind: RunLogItem["k"]; days: string[]; log: RunLogItem[]; label: string }) {
  const data = days.map((d) => ({ day: day(d), passed: 0, failed: 0, cancelled: 0 }))
  const at = new Map(days.map((d, i) => [d, i]))
  for (const r of log) {
    const i = at.get(dayOf(r.at))
    if (r.k !== kind || i == null || r.c === "running") continue
    data[i][r.c] += 1
  }
  const total = sum(data.map((d) => d.passed + d.failed + d.cancelled))
  return (
    <ChartCard title={title} description={`${total} finished ${label} runs by result`} empty={!total && "No run in this view."}>
      <ChartContainer config={statusConfig} className="aspect-auto h-[220px] w-full">
        <BarChart data={data} margin={{ left: 0, right: 4, top: 8 }} maxBarSize={24}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="day" {...axisX} />
          <YAxis allowDecimals={false} {...axisY} width={28} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="passed" stackId="r" fill="var(--color-passed)" {...gap} />
          <Bar dataKey="failed" stackId="r" fill="var(--color-failed)" {...gap} />
          <Bar dataKey="cancelled" stackId="r" fill="var(--color-cancelled)" radius={[4, 4, 0, 0]} {...gap} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}

const checksConfig = { seconds: { label: "Seconds", color: "hsl(var(--chart-2))" } } satisfies ChartConfig

function ChecksDuration({ log, name }: { log: RunLogItem[]; name: string }) {
  const data = log
    .filter((r) => r.k === "checks" && (r.c === "passed" || r.c === "failed") && r.d != null)
    .map((r) => ({ label: zoneStamp.format(new Date(r.at)), branch: r.b, seconds: r.d }))
  // median, not mean: one run stuck waiting for a runner would drag the mean far from a typical run
  const sorted = data.map((d) => d.seconds!).sort((a, b) => a - b)
  const mean = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null
  return (
    <ChartCard
      title={`${name} run duration`}
      description={mean == null ? `Seconds per ${name} run` : `Seconds per ${name} run, typically ${mean} s (dashed: median)`}
      empty={!data.length && `No ${name} run in this view.`}
    >
      <ChartContainer config={checksConfig} className="aspect-auto h-[220px] w-full">
        <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" {...axisX} tick={false} height={8} />
          <YAxis allowDecimals={false} {...axisY} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={withBranch} indicator="line" />} />
          {mean != null && <ReferenceLine y={mean} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />}
          <Line dataKey="seconds" type="monotone" stroke="var(--color-seconds)" strokeWidth={2} dot={data.length <= 30 ? dotFor("var(--color-seconds)") : false} />
        </LineChart>
      </ChartContainer>
    </ChartCard>
  )
}

/* ------------------------------------------------------------------ end-to-end per-run charts */

function ResultsPerRun({ runs }: { runs: TrendRun[] }) {
  return (
    <ChartCard
      title="Test results per run"
      description="Scenario results summed over every system, oldest on the left"
      className="xl:col-span-2"
      empty={!runs.length && "No end-to-end run in this view."}
    >
      <ChartContainer config={statusConfig} className="aspect-auto h-[220px] w-full">
        <BarChart data={runs} margin={{ left: 0, right: 4, top: 8 }} maxBarSize={24}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" {...axisX} />
          <YAxis allowDecimals={false} {...axisY} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={withBranch} />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="passed" stackId="r" fill="var(--color-passed)" {...gap} />
          <Bar dataKey="failed" stackId="r" fill="var(--color-failed)" {...gap} />
          <Bar dataKey="skipped" stackId="r" fill="var(--color-skipped)" radius={[4, 4, 0, 0]} {...gap} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}

const rateConfig = { passRate: { label: "Pass rate (%)", color: "hsl(var(--chart-1))" } } satisfies ChartConfig

function PassRate({ runs }: { runs: TrendRun[] }) {
  const data = runs.map((r) => ({ label: r.label, branch: r.branch, passRate: r.passRate ?? null }))
  const last = data.at(-1)?.passRate
  return (
    <ChartCard
      title="Test pass rate per run"
      description={last == null ? "Passed scenario results out of passed and failed" : `Passed out of passed and failed results, ${last}% in the latest run`}
      empty={!runs.length && "No end-to-end run in this view."}
    >
      <ChartContainer config={rateConfig} className="aspect-auto h-[220px] w-full">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" {...axisXLine} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} {...axisY} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={withBranch} indicator="line" />} />
          <Area
            dataKey="passRate"
            type="monotone"
            stroke="var(--color-passRate)"
            strokeWidth={2}
            fill="var(--color-passRate)"
            fillOpacity={0.1}
            dot={dotFor("var(--color-passRate)")}
          />
        </AreaChart>
      </ChartContainer>
    </ChartCard>
  )
}

function osChartConfig(osOrder: string[], prefix: string): ChartConfig {
  return Object.fromEntries(osOrder.map((os, i) => [`${prefix}${osKey(os)}`, { label: os, color: osColor(i) }]))
}

function DurationBySystem({ runs, osOrder }: { runs: TrendRun[]; osOrder: string[] }) {
  const config = osChartConfig(osOrder, "d_")
  const data = runs.map((r) => {
    const row: Record<string, unknown> = { label: r.label, branch: r.branch }
    for (const os of osOrder) row[`d_${osKey(os)}`] = minutes(r.oses?.[os]?.d)
    return row
  })
  return (
    <ChartCard
      title="Duration by system"
      description="Minutes each system's VM took to boot, run every scenario and reboot"
      className="xl:col-span-2"
      empty={!runs.some((r) => r.oses) && "No per-system timing in this view."}
    >
      <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
        <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" {...axisXLine} />
          <YAxis {...axisY} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={withBranch} indicator="line" />} />
          <ChartLegend content={<ChartLegendContent />} />
          {osOrder.map((os) => (
            <Line
              key={os}
              dataKey={`d_${osKey(os)}`}
              type="monotone"
              stroke={`var(--color-d_${osKey(os)})`}
              strokeWidth={2}
              dot={dotFor(`var(--color-d_${osKey(os)})`)}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </ChartCard>
  )
}

const durationConfig = { minutes: { label: "Minutes", color: "hsl(var(--chart-1))" } } satisfies ChartConfig

function RunDuration({ runs }: { runs: TrendRun[] }) {
  const data = runs.map((r) => ({ label: r.label, branch: r.branch, minutes: minutes(r.durationS) ?? r.minutes }))
  const mean = avg(data.filter((d) => d.minutes != null).map((d) => d.minutes!))
  return (
    <ChartCard
      title="End-to-end run duration"
      description={mean == null ? "Minutes from start to report" : `Minutes from start to report, ${mean.toFixed(1)} on average (dashed)`}
      empty={!runs.length && "No end-to-end run in this view."}
    >
      <ChartContainer config={durationConfig} className="aspect-auto h-[240px] w-full">
        <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" {...axisXLine} />
          <YAxis {...axisY} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={withBranch} indicator="line" />} />
          {mean != null && <ReferenceLine y={mean} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />}
          <Line dataKey="minutes" type="monotone" stroke="var(--color-minutes)" strokeWidth={2} dot={dotFor("var(--color-minutes)")} />
        </LineChart>
      </ChartContainer>
    </ChartCard>
  )
}

function FailuresBySystem({ runs, osOrder }: { runs: TrendRun[]; osOrder: string[] }) {
  const config = osChartConfig(osOrder, "f_")
  const data = runs.map((r) => {
    const row: Record<string, unknown> = { label: r.label, branch: r.branch }
    for (const os of osOrder) row[`f_${osKey(os)}`] = r.oses?.[os]?.f ?? 0
    return row
  })
  const total = sum(runs.map((r) => r.failed))
  return (
    <ChartCard
      title="Failures by system"
      description={total ? `${total} failed scenario results in this view, split by the system they failed on` : "Failed scenario results per run, split by system"}
      className="xl:col-span-2"
      empty={!runs.length && "No end-to-end run in this view."}
    >
      <ChartContainer config={config} className="aspect-auto h-[220px] w-full">
        <BarChart data={data} margin={{ left: 0, right: 4, top: 8 }} maxBarSize={24}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" {...axisX} />
          <YAxis allowDecimals={false} {...axisY} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={withBranch} />} />
          <ChartLegend content={<ChartLegendContent />} />
          {osOrder.map((os, i) => (
            <Bar
              key={os}
              dataKey={`f_${osKey(os)}`}
              stackId="f"
              fill={`var(--color-f_${osKey(os)})`}
              radius={i === osOrder.length - 1 ? [4, 4, 0, 0] : undefined}
              {...gap}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}

const changesConfig = {
  newFailures: { label: "New failures", color: "hsl(var(--destructive))" },
  fixed: { label: "Fixed", color: "hsl(var(--success))" },
} satisfies ChartConfig

function Changes({ runs }: { runs: TrendRun[] }) {
  const data = runs.map((r) => ({ label: r.label, branch: r.branch, newFailures: r.newFailures ?? 0, fixed: r.fixed ?? 0 }))
  return (
    <ChartCard
      title="New failures and fixes"
      description="Results that changed against the run before on the same branch (or the default branch)"
      empty={!runs.length && "No end-to-end run in this view."}
    >
      <ChartContainer config={changesConfig} className="aspect-auto h-[220px] w-full">
        <BarChart data={data} margin={{ left: 0, right: 4, top: 8 }} maxBarSize={20} barGap={2}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" {...axisX} />
          <YAxis allowDecimals={false} {...axisY} width={28} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={withBranch} />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="newFailures" fill="var(--color-newFailures)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="fixed" fill="var(--color-fixed)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}

const suiteConfig = { assertions: { label: "Assertions", color: "hsl(var(--chart-3))" } } satisfies ChartConfig

function SuiteSize({ runs }: { runs: TrendRun[] }) {
  const data = runs.filter((r) => r.assertions != null).map((r) => ({ label: r.label, branch: r.branch, assertions: r.assertions }))
  const last = runs.at(-1)
  return (
    <ChartCard
      title="Test suite size"
      description={
        last?.scenarios
          ? `Assertions checked per run. Latest: ${last.scenarios} scenarios on ${Object.keys(last.oses ?? {}).length} systems, ${last.assertions} assertions`
          : "Assertions checked per run, every system"
      }
      empty={!data.length && "No end-to-end run in this view."}
    >
      <ChartContainer config={suiteConfig} className="aspect-auto h-[220px] w-full">
        <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" {...axisXLine} />
          <YAxis domain={["auto", "auto"]} allowDecimals={false} {...axisY} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={withBranch} indicator="line" />} />
          <Line dataKey="assertions" type="stepAfter" stroke="var(--color-assertions)" strokeWidth={2} dot={dotFor("var(--color-assertions)")} />
        </LineChart>
      </ChartContainer>
    </ChartCard>
  )
}

/* ------------------------------------------------------------------ scenario-level charts */

function ScenarioDuration({ tests, runs, runIndex }: { tests: Tests; runs: TrendRun[]; runIndex: Map<number, number> }) {
  const [scenario, setScenario] = useState(tests.slowest[0]?.scenario ?? tests.scenarios[0]?.id ?? "")
  const config = osChartConfig(tests.osOrder, "d_")
  const rows = tests.rows.filter((r) => r.scenario === scenario)
  const hasDurs = rows.some((r) => r.durs)
  const data = runs.map((run) => {
    const i = runIndex.get(run.runId)
    const point: Record<string, unknown> = { label: run.label, branch: run.branch }
    for (const r of rows) {
      const code = i == null ? "-" : r.seq[i]
      point[`d_${osKey(r.os)}`] = i == null || code === "S" || code === "-" ? null : (r.durs?.[i] ?? null)
    }
    return point
  })

  return (
    <Card className="min-w-0 xl:col-span-2">
      <CardHeader className="flex flex-col gap-3 space-y-0 pb-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <CardTitle className="text-base">Scenario duration history</CardTitle>
          <CardDescription>Seconds one scenario took on each system, run by run. Skipped runs are left out.</CardDescription>
        </div>
        <Select value={scenario} onValueChange={setScenario}>
          <SelectTrigger className="h-9 w-full md:w-[240px]" aria-label="Scenario">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tests.scenarios.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {!runs.length || !hasDurs ? (
          <Empty>{runs.length ? "Timings per scenario arrive with the next refresh." : "No end-to-end run in this view."}</Empty>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
            <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" {...axisXLine} />
              <YAxis allowDecimals={false} {...axisY} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={withBranch} indicator="line" />} />
              <ChartLegend content={<ChartLegendContent />} />
              {rows.map((r) => (
                <Line
                  key={r.os}
                  dataKey={`d_${osKey(r.os)}`}
                  type="monotone"
                  stroke={`var(--color-d_${osKey(r.os)})`}
                  strokeWidth={2}
                  dot={dotFor(`var(--color-d_${osKey(r.os)})`)}
                />
              ))}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

const slowConfig = { avgS: { label: "Average seconds", color: "hsl(var(--chart-1))" } } satisfies ChartConfig

function Slowest({ tests, runs, runIndex }: { tests: Tests; runs: TrendRun[]; runIndex: Map<number, number> }) {
  const data = useMemo(() => {
    const idx = runs.map((r) => runIndex.get(r.runId)).filter((i): i is number => i != null)
    const by = new Map<string, number[]>()
    for (const row of tests.rows) {
      for (const i of idx) {
        const d = row.durs?.[i]
        if (d != null && row.seq[i] !== "S") by.set(row.scenario, [...(by.get(row.scenario) ?? []), d])
      }
    }
    if (!by.size) return tests.slowest.map((s) => ({ name: s.scenario, avgS: s.avgS, maxS: s.maxS }))
    return [...by.entries()]
      .map(([name, xs]) => ({ name, avgS: Math.round(avg(xs)!), maxS: Math.max(...xs) }))
      .sort((a, b) => b.avgS - a.avgS)
      .slice(0, 8)
  }, [tests.rows, tests.slowest, runs, runIndex])

  return (
    <ChartCard title="Slowest scenarios" description="Average seconds per run in this view, every system" empty={!data.length && "No timing yet."}>
      <ChartContainer config={slowConfig} className="aspect-auto h-[240px] w-full">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 48 }} maxBarSize={20}>
          <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={124} fontSize={11} className="font-mono" />
          <XAxis type="number" hide />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="avgS" fill="var(--color-avgS)" radius={4}>
            <LabelList dataKey="avgS" position="right" className="fill-foreground" fontSize={11} formatter={(v: number) => `${v}\u00a0s`} />
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}

/* ------------------------------------------------------------------ table twin */

function RunsTable({ runs }: { runs: TrendRun[] }) {
  const shown = [...runs].reverse()
  return (
    <Card className="min-w-0 xl:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">End-to-end runs in this view</CardTitle>
        <CardDescription>The numbers behind the charts, newest first</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-2 sm:px-6">
        {!shown.length ? (
          <Empty>No end-to-end run in this view.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead className="text-right">Passed</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead className="text-right">Skipped</TableHead>
                <TableHead className="text-right">Pass rate</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r) => (
                <TableRow key={r.runId}>
                  <TableCell>
                    <div className="flex flex-col">
                      {r.url ? (
                        <ExtLink href={r.url} className="font-mono text-xs">
                          {r.label}
                        </ExtLink>
                      ) : (
                        <span className="font-mono text-xs">{r.label}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        <span className="font-mono">{r.branch}</span>
                        {r.pr ? ` · #${r.pr}` : ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.passed}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", r.failed > 0 && "text-destructive")}>{r.failed}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{r.skipped}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.passRate == null ? "—" : `${r.passRate}%`}</TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      {r.newFailures ? <StatusBadge tone="bad">{r.newFailures} new</StatusBadge> : null}
                      {r.fixed ? <StatusBadge tone="ok">{r.fixed} fixed</StatusBadge> : null}
                      {!r.newFailures && !r.fixed && (
                        <span className="text-xs text-muted-foreground">{r.hasBaseline === false ? "first run" : "none"}</span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                    {secs(r.durationS ?? (r.minutes != null ? r.minutes * 60 : null))}
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

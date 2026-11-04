import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Separator } from "@/components/ui/separator"
import { Empty, ExtLink, StatusBadge } from "@/components/status"
import { day, plural, rel, when } from "@/lib/format"
import type { Snapshot } from "@/lib/types"

const activityConfigFor = (branch: string) =>
  ({
    commits: { label: `Commits on ${branch}`, color: "hsl(var(--chart-1))" },
    prsMerged: { label: "PRs merged", color: "hsl(var(--chart-2))" },
    issuesClosed: { label: "Issues closed", color: "hsl(var(--chart-3))" },
  }) satisfies ChartConfig

const trendConfig = {
  openIssues: { label: "Open issues", color: "hsl(var(--chart-1))" },
  openBugs: { label: "Open bugs", color: "hsl(var(--chart-5))" },
  openPrs: { label: "Open PRs", color: "hsl(var(--chart-2))" },
  attention: { label: "Warnings", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig

export function Overview({ data }: { data: Snapshot }) {
  const branch = data.board.defaultBranch
  const activityConfig = activityConfigFor(branch)
  const days = data.activity.days.map((d) => ({ ...d, label: day(d.date) }))
  const totals = data.activity.days.reduce(
    (t, d) => ({
      commits: t.commits + d.commits,
      prsMerged: t.prsMerged + d.prsMerged,
      issuesClosed: t.issuesClosed + d.issuesClosed,
      issuesOpened: t.issuesOpened + d.issuesOpened,
      prsOpened: t.prsOpened + d.prsOpened,
    }),
    { commits: 0, prsMerged: 0, issuesClosed: 0, issuesOpened: 0, prsOpened: 0 },
  )
  const trend = data.trend.map((p) => ({ ...p, label: `${day(p.at.slice(0, 10))} ${p.slot.endsWith("am") ? "AM" : "PM"}` }))

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="min-w-0 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Delivered, last 14 days</CardTitle>
          <CardDescription>
            {plural(totals.commits, "commit")} on {branch} · {plural(totals.prsMerged, "PR")} merged ·{" "}
            {plural(totals.issuesClosed, "issue")} closed · {totals.prsOpened} PRs and {totals.issuesOpened} issues opened
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={activityConfig} className="aspect-auto h-[220px] w-full">
            <BarChart data={days} margin={{ left: 0, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="commits" stackId="a" fill="var(--color-commits)" />
              <Bar dataKey="prsMerged" stackId="a" fill="var(--color-prsMerged)" />
              <Bar dataKey="issuesClosed" stackId="a" fill="var(--color-issuesClosed)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <SinceLast data={data} />

      <Card className="min-w-0 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Trend across refreshes</CardTitle>
          <CardDescription>
            One point per refresh (morning and evening).{" "}
            {trend.length < 3 && "The lines fill in over the next days."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trendConfig} className="aspect-auto h-[220px] w-full">
            <LineChart data={trend} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {(Object.keys(trendConfig) as (keyof typeof trendConfig)[]).map((k) => (
                <Line
                  key={k}
                  dataKey={k}
                  type="monotone"
                  stroke={`var(--color-${k})`}
                  strokeWidth={2}
                  dot={{ r: trend.length < 8 ? 3 : 0, fill: `var(--color-${k})` }}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Latest on {branch}</CardTitle>
          <CardDescription>Recent commits and merged pull requests</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {data.activity.commits.length === 0 && <Empty>No commit on {branch} in 14 days.</Empty>}
          <ul className="flex flex-col gap-2.5">
            {data.activity.commits.slice(0, 6).map((c) => (
              <li key={c.sha} className="flex min-w-0 flex-col">
                <ExtLink href={c.url} className="line-clamp-2 leading-snug">
                  {c.message}
                </ExtLink>
                <span className="text-xs text-muted-foreground">
                  <span className="font-mono">{c.sha}</span> · {c.author} · {rel(c.date)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

type ChangeItem = { key: string; href: string; text: string; by?: string }

function SinceLast({ data }: { data: Snapshot }) {
  const c = data.changes
  const groups: { title: string; items: ChangeItem[] }[] = [
    { title: "New pull requests", items: c.newPrs.map((p) => ({ key: `p${p.number}`, href: p.url, text: `#${p.number} ${p.title}`, by: p.author })) },
    { title: "Merged", items: c.mergedPrs.map((p) => ({ key: `m${p.number}`, href: p.url, text: `#${p.number} ${p.title}` })) },
    { title: "New issues", items: c.newIssues.map((i) => ({ key: `i${i.number}`, href: i.url, text: `#${i.number} ${i.title}`, by: i.author })) },
    { title: "Closed issues", items: c.closedIssues.map((i) => ({ key: `c${i.number}`, href: i.url, text: `#${i.number} ${i.title}` })) },
    { title: "Failed CI runs", items: c.ciFailures.map((f, n) => ({ key: `f${n}`, href: f.url, text: `${f.workflow} on ${f.branch}` })) },
  ].filter((g) => g.items.length)
  const quiet = !groups.length && !c.routineRuns.succeeded && !c.routineRuns.failed

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Since the last refresh</CardTitle>
        <CardDescription>Changes after {when(c.since)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Routine runs</span>
          <StatusBadge tone={c.routineRuns.succeeded ? "ok" : "neutral"}>{c.routineRuns.succeeded} succeeded</StatusBadge>
          {c.routineRuns.failed > 0 && <StatusBadge tone="bad">{c.routineRuns.failed} failed</StatusBadge>}
        </div>
        {quiet && <Empty>Nothing changed on GitHub.</Empty>}
        {groups.map((g) => (
          <div key={g.title} className="flex flex-col gap-1.5">
            <Separator />
            <p className="pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {g.title} · {g.items.length}
            </p>
            <ul className="flex flex-col gap-1">
              {g.items.slice(0, 5).map((it) => (
                <li key={it.key} className="min-w-0 truncate">
                  <ExtLink href={it.href}>{it.text}</ExtLink>
                  {it.by && <span className="text-xs text-muted-foreground"> · {it.by}</span>}
                </li>
              ))}
              {g.items.length > 5 && <li className="text-xs text-muted-foreground">and {g.items.length - 5} more</li>}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

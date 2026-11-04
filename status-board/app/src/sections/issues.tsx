import { useState } from "react"
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Empty, ExtLink, StatusBadge, type Tone } from "@/components/status"
import { cn } from "@/lib/utils"
import { rel, when } from "@/lib/format"
import type { IssueBrief, Issues } from "@/lib/types"

const typeConfig = { count: { label: "Open", color: "hsl(var(--chart-1))" } } satisfies ChartConfig

type QueueKey = keyof Issues["queues"]
const queueMeta: { key: QueueKey; label: string; hint: string }[] = [
  { key: "highBugs", label: "High-priority bugs", hint: "bug or security issues marked priority: high" },
  { key: "agentReady", label: "Agent-ready", hint: "the issue developer picks one of these every 4 h" },
  { key: "needsInfo", label: "Needs info", hint: "waiting for an answer before work can start" },
  { key: "blocked", label: "Blocked", hint: "status: blocked after failed routine attempts" },
  { key: "proposals", label: "Proposals", hint: "from market research; add ready to let the routines build one" },
]
const prioTone: Record<string, Tone> = { high: "bad", medium: "warn", low: "neutral" }

export function IssuesTab({ issues }: { issues: Issues }) {
  const [queue, setQueue] = useState<QueueKey>("highBugs")
  const types = Object.entries(issues.byType)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
  const meta = queueMeta.find((q) => q.key === queue)!
  const rows: IssueBrief[] = issues.queues[queue]

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Open issues by type</CardTitle>
          <CardDescription>
            Priority: {issues.byPriority.high ?? 0} high · {issues.byPriority.medium ?? 0} medium · {issues.byPriority.low ?? 0} low
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={typeConfig} className="aspect-auto h-[190px] w-full">
            <BarChart data={types} layout="vertical" margin={{ left: 0, right: 28 }}>
              <YAxis dataKey="type" type="category" tickLine={false} axisLine={false} width={96} />
              <XAxis type="number" hide allowDecimals={false} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={4}>
                <LabelList dataKey="count" position="right" className="fill-foreground" fontSize={12} />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="min-w-0 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Milestones</CardTitle>
          <CardDescription>Closed out of all issues in each open milestone. Red: finished, run the release</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {issues.milestones.length === 0 && <Empty>No open milestone.</Empty>}
          {issues.milestones.map((m) => {
            const total = m.open + m.closed
            const pct = total ? Math.round((100 * m.closed) / total) : 0
            const done = m.state === "done"
            return (
              <div
                key={m.title}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1",
                  done && "-mx-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5",
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <ExtLink href={m.url} className={cn("truncate text-sm font-medium", done && "text-destructive")}>
                    {m.title}
                  </ExtLink>
                  {done && <StatusBadge tone="bad">Finished: run the release</StatusBadge>}
                  {m.state === "developed" && (
                    <StatusBadge tone="warn">All developed: merge {m.toMerge?.map((n) => `#${n}`).join(", ")}</StatusBadge>
                  )}
                </div>
                <span className={cn("text-xs tabular-nums text-muted-foreground", done && "text-destructive")}>
                  {m.closed}/{total} · {pct}%{m.due ? ` · due ${when(m.due)}` : ""}
                </span>
                <Progress value={pct} className={cn("col-span-2 h-1.5", done && "bg-destructive/20 [&>div]:bg-destructive")} />
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="min-w-0 lg:col-span-2">
        <CardHeader className="flex flex-col gap-3 space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Work queues</CardTitle>
            <CardDescription>{meta.hint}</CardDescription>
          </div>
          <ToggleGroup
            type="single"
            value={queue}
            onValueChange={(v) => v && setQueue(v as QueueKey)}
            variant="outline"
            size="sm"
            className="flex-wrap justify-start"
          >
            {queueMeta.map((q) => (
              <ToggleGroupItem key={q.key} value={q.key} id={`queue-${q.key}`}>
                {q.label} {issues.queues[q.key].length}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardHeader>
        <CardContent className="px-0 pb-2 sm:px-6">
          {rows.length === 0 ? (
            <Empty>Empty queue.</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[16rem]">Issue</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">PR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 12).map((i) => (
                  <TableRow key={i.number}>
                    <TableCell>
                      <ExtLink href={i.url}>
                        <span className="font-mono text-muted-foreground">#{i.number}</span> {i.title}
                      </ExtLink>
                    </TableCell>
                    <TableCell>
                      {i.priority ? <StatusBadge tone={prioTone[i.priority] ?? "neutral"}>{i.priority}</StatusBadge> : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{i.size ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {i.hasPr ? <StatusBadge tone="info">open</StatusBadge> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {rows.length > 12 && <p className="px-4 pt-2 text-xs text-muted-foreground sm:px-0">and {rows.length - 12} more</p>}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recently updated</CardTitle>
          <CardDescription>Open issues with the latest activity</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2.5 text-sm">
            {issues.recent.map((i) => (
              <li key={i.number} className="flex min-w-0 flex-col gap-1">
                <ExtLink href={i.url} className="line-clamp-2 leading-snug">
                  <span className="font-mono text-muted-foreground">#{i.number}</span> {i.title}
                </ExtLink>
                <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  {i.labels.slice(0, 3).map((l) => (
                    <Badge key={l} variant="secondary" className="px-1.5 py-0 font-normal">
                      {l}
                    </Badge>
                  ))}
                  <span>{rel(i.updatedAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

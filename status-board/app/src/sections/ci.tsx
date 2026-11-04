import { ArrowUpRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Empty, ExtLink, StatusBadge, runLabel, runTone } from "@/components/status"
import { rel } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import type { Ci, E2e, E2eRun } from "@/lib/types"

export function CiTab({ ci, e2e }: { ci: Ci; e2e?: E2e }) {
  const branch = ci.defaultBranch
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {e2e && (
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="flex flex-col gap-3 space-y-0 pb-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">End-to-end tests</CardTitle>
              <CardDescription>
                {e2e.description || `Latest runs of the ${e2e.name} workflow, one job per system.`}
              </CardDescription>
            </div>
            {e2e.reportUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={e2e.reportUrl} target="_blank" rel="noreferrer">
                  HTML reports
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {!e2e.main && !e2e.latest && <Empty>No end-to-end run in the last 30 days.</Empty>}
            <E2eMatrix title={branch} run={e2e.main} missing={`No end-to-end run on ${branch} yet.`} />
            {e2e.latest && <E2eMatrix title={e2e.latest.branch} run={e2e.latest} />}
          </CardContent>
        </Card>
      )}

      <Card className="min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Latest result on {branch}</CardTitle>
          <CardDescription>Last run of each workflow on the {branch} branch</CardDescription>
        </CardHeader>
        <CardContent>
          {ci.main.length === 0 && <Empty>No workflow ran on {branch} in 14 days.</Empty>}
          <ul className="divide-y">
            {ci.main.map((w) => (
              <li key={w.workflow} className="flex items-center gap-3 py-2 text-sm">
                <ExtLink href={w.url} className="min-w-0 flex-1 truncate font-medium">
                  {w.workflow}
                </ExtLink>
                {w.required && <RequiredBadge />}
                <span className="text-xs text-muted-foreground">{rel(w.createdAt)}</span>
                <StatusBadge tone={runTone(w.status, w.conclusion)} className="w-[5.5rem] justify-center">
                  {runLabel(w.status, w.conclusion)}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pass rate by workflow, 7 days</CardTitle>
          <CardDescription>Success out of finished runs; cancelled and approval-pending runs are left out</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {ci.byWorkflow.map((w) => (
            <div key={w.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium">{w.name}</span>
                {w.required && <RequiredBadge />}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {w.passRate == null ? "no finished run" : `${w.passRate}% · ${w.success}/${w.success + w.failure}`}
                {w.other ? ` · ${w.other} other` : ""}
              </span>
              <Progress value={w.passRate ?? 0} className="col-span-2 h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="min-w-0 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent workflow runs</CardTitle>
          <CardDescription>Newest first, all branches</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead className="min-w-[14rem]">Run</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ci.recent.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap font-medium">{r.workflow}</TableCell>
                  <TableCell>
                    <ExtLink href={r.url} className="line-clamp-1">
                      {r.title || r.event}
                    </ExtLink>
                  </TableCell>
                  <TableCell className="max-w-[12rem] truncate font-mono text-xs">{r.branch}</TableCell>
                  <TableCell>
                    <StatusBadge tone={runTone(r.status, r.conclusion)}>{runLabel(r.status, r.conclusion)}</StatusBadge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-muted-foreground">{rel(r.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function RequiredBadge() {
  return (
    <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[11px] font-normal">
      required
    </Badge>
  )
}

function E2eMatrix({ title, run, missing }: { title: string; run: E2eRun | null; missing?: string }) {
  if (!run) return missing ? <p className="text-sm text-muted-foreground">{missing}</p> : null
  const passed = run.jobs.filter((j) => j.conclusion === "success").length
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-mono text-xs">{title}</span>
        <StatusBadge tone={runTone(run.status, run.conclusion)}>{runLabel(run.status, run.conclusion)}</StatusBadge>
        <span className="text-muted-foreground">
          {passed}/{run.jobs.length} pass · {rel(run.createdAt)} ·{" "}
          <ExtLink href={run.url} className="underline">
            run
          </ExtLink>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {run.jobs.map((j) => (
          <a
            key={j.name}
            href={j.url}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col gap-1.5 rounded-md border p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="font-mono text-xs">{j.name}</span>
            <div className="flex items-center justify-between gap-2">
              <StatusBadge tone={runTone(j.status, j.conclusion)}>{runLabel(j.status, j.conclusion)}</StatusBadge>
              <span className="text-xs tabular-nums text-muted-foreground">{j.minutes != null ? `${j.minutes} min` : ""}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

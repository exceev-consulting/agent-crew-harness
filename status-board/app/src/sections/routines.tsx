import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Dot, ExtLink, StatusBadge, type Tone } from "@/components/status"
import { rel, when } from "@/lib/format"
import type { Routine, Snapshot } from "@/lib/types"

const healthTone: Record<Routine["health"], Tone> = { ok: "ok", failed: "bad", missed: "warn", running: "running", paused: "neutral" }
const healthLabel: Record<Routine["health"], string> = { ok: "on schedule", failed: "last run failed", missed: "missed run", running: "running", paused: "paused" }
const runTone: Record<string, Tone> = { succeeded: "ok", failed: "bad", running: "running" }

export function RoutinesTab({ routines, locks, bot }: { routines: Routine[]; locks: Snapshot["locks"]; bot: string }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Scheduled routines</CardTitle>
          <CardDescription>
            Claude app scheduled tasks. They run only while the app is open; a missed run starts at the next launch.
            {bot && ` Everything they post on GitHub goes out as ${bot}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[13rem]">Routine</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Last run</TableHead>
                <TableHead>Next run</TableHead>
                <TableHead>Recent runs</TableHead>
                <TableHead className="min-w-[16rem]">Last result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routines.map((r) => {
                const last = r.recent[0]
                const result = last?.error || last?.summary
                return (
                  <TableRow key={r.id}>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium capitalize">{r.title}</span>
                        <span className="text-xs text-muted-foreground">{r.schedule}</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <StatusBadge tone={healthTone[r.health]}>{healthLabel[r.health]}</StatusBadge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap align-top">
                      {last ? (
                        <div className="flex flex-col gap-0.5">
                          <span>{rel(last.startedAt)}</span>
                          <span className="text-xs text-muted-foreground">
                            {last.status}
                            {last.minutes != null ? ` · ${last.minutes} min` : ""}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">never</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap align-top">
                      {r.nextRunAt ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span tabIndex={0}>{rel(r.nextRunAt)}</span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">{when(r.nextRunAt)}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center">
                          {r.recent.length === 0 && <span className="text-xs text-muted-foreground">none</span>}
                          {[...r.recent].reverse().map((run, i) => (
                            <Dot
                              key={i}
                              tone={runTone[run.status] ?? "neutral"}
                              label={`${when(run.startedAt)}: ${run.status}${run.minutes != null ? ` (${run.minutes} min)` : ""}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {r.runs7d.succeeded}/{r.runs7d.total} ok, 7 d
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {result ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p tabIndex={0} className={`line-clamp-2 ${last?.error ? "text-destructive" : ""}`}>
                              {result}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm text-xs">{result}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">{last ? "no summary" : r.description}</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {locks.length > 0 && (
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Issue developer: held or stopped issues</CardTitle>
            <CardDescription>
              A failed attempt is skipped for 7 days; after 2 the issue gets status: blocked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {locks.map((l) => (
                <li key={`${l.issue}-${l.kind}`} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <ExtLink href={l.url} className="font-mono">
                    #{l.issue}
                  </ExtLink>
                  <StatusBadge tone={l.kind === "failed" ? "warn" : "running"}>{l.state || l.kind}</StatusBadge>
                  <span className="min-w-0 flex-1">{l.note}</span>
                  <span className="text-xs text-muted-foreground">{rel(l.at)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

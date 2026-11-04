import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Empty, ExtLink, StatusBadge, type Tone } from "@/components/status"
import type { Board, Pr } from "@/lib/types"

type Filter = "all" | "you" | "routine" | "community"

const checkTone: Record<Pr["checks"], Tone> = { passing: "ok", failing: "bad", pending: "running", none: "neutral" }
const checkLabel: Record<Pr["checks"], string> = { passing: "passing", failing: "failing", pending: "running", none: "not run" }
const reviewTone: Record<string, Tone> = { "looks good": "ok", "changes suggested": "warn", "do not merge": "bad" }

export function PullRequests({ prs, board }: { prs: Pr[]; board: Board }) {
  const [filter, setFilter] = useState<Filter>("all")
  const community = (p: Pr) => !p.isRoutine && !board.maintainers.includes(p.author)
  const counts = {
    all: prs.length,
    you: prs.filter((p) => p.waitingWho === "you").length,
    routine: prs.filter((p) => p.isRoutine).length,
    community: prs.filter(community).length,
  }
  const shown = prs.filter((p) =>
    filter === "you"
      ? p.waitingWho === "you"
      : filter === "routine"
        ? p.isRoutine
        : filter === "community"
          ? community(p)
          : true,
  )

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-col gap-3 space-y-0 pb-3 md:flex-row md:items-end md:justify-between">
        <div>
          <CardTitle className="text-base">Open pull requests</CardTitle>
          <CardDescription>
            Review labels come from the PR review routine.
            {board.maintainer && board.coMaintainer && ` A PR opened by ${board.maintainer} needs ${board.coMaintainer}'s approval.`}
          </CardDescription>
        </div>
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(v) => v && setFilter(v as Filter)}
          variant="outline"
          size="sm"
          className="flex-wrap justify-start"
        >
          <ToggleGroupItem value="all" id="pr-filter-all">All {counts.all}</ToggleGroupItem>
          <ToggleGroupItem value="you" id="pr-filter-you">Waiting on you {counts.you}</ToggleGroupItem>
          <ToggleGroupItem value="routine" id="pr-filter-routine">Routines {counts.routine}</ToggleGroupItem>
          <ToggleGroupItem value="community" id="pr-filter-community">Community {counts.community}</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="px-0 pb-2 sm:px-6">
        {shown.length === 0 ? (
          <Empty>No pull request in this view.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[18rem]">Pull request</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Checks</TableHead>
                <TableHead>Review</TableHead>
                <TableHead className="min-w-[12rem]">Next step</TableHead>
                <TableHead className="text-right">Age</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((p) => (
                <TableRow key={p.number}>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-1">
                      <ExtLink href={p.url} className="font-medium leading-snug">
                        <span className="font-mono text-muted-foreground">#{p.number}</span> {p.title}
                      </ExtLink>
                      <div className="flex flex-wrap items-center gap-1">
                        {p.draft && <Badge variant="outline">draft</Badge>}
                        {p.labels
                          .filter((l) => !["claude", "first-time contributor", "needs-ci-approval"].includes(l))
                          .slice(0, 4)
                          .map((l) => (
                            <Badge key={l} variant="secondary" className="font-normal">
                              {l}
                            </Badge>
                          ))}
                        <span className="text-xs text-muted-foreground">
                          {p.areas.slice(0, 3).join(", ")}
                          {p.areas.length > 3 ? ` +${p.areas.length - 3}` : ""}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap align-top">
                    <div className="flex flex-col items-start gap-1">
                      <span>{p.author}</span>
                      {p.isBot && <Badge variant="outline" className="font-normal">routine bot</Badge>}
                      {p.labels.includes("first-time contributor") && (
                        <Badge variant="outline" className="font-normal">first time</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    {p.failingChecks.length ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0}>
                            <StatusBadge tone="bad">failing {p.failingChecks.length}</StatusBadge>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">{p.failingChecks.join(", ")}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <StatusBadge tone={checkTone[p.checks]}>{checkLabel[p.checks]}</StatusBadge>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    {p.reviewDecision === "APPROVED" ? (
                      <StatusBadge tone="ok">approved</StatusBadge>
                    ) : p.review ? (
                      <StatusBadge tone={reviewTone[p.review] ?? "neutral"}>{p.review}</StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">not reviewed</StatusBadge>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge
                      variant={p.waitingWho === "you" ? "default" : p.waitingWho === "other" ? "secondary" : "outline"}
                      className="whitespace-nowrap font-medium"
                    >
                      {p.waitingOn}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right align-top tabular-nums text-muted-foreground">
                    {p.ageDays ?? "—"} d
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

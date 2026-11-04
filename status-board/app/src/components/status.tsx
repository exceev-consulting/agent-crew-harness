import { ArrowUpRight, LoaderCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export type Tone = "ok" | "warn" | "bad" | "info" | "running" | "neutral"

const toneClass: Record<Tone, string> = {
  ok: "border-success/30 bg-success/10 text-success",
  warn: "border-warning/30 bg-warning/10 text-warning",
  bad: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-chart-1/30 bg-chart-1/10 text-chart-1",
  running: "border-chart-1/30 bg-chart-1/10 text-chart-1",
  neutral: "border-border bg-transparent text-muted-foreground",
}

const dotClass: Record<Tone, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  bad: "bg-destructive",
  info: "bg-chart-1",
  running: "bg-chart-1 animate-pulse",
  neutral: "bg-muted-foreground/40",
}

export function StatusBadge({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <Badge variant="outline" className={cn("gap-1 whitespace-nowrap font-medium", toneClass[tone], className)}>
      {tone === "running" && <LoaderCircle className="h-3 w-3 animate-spin" />}
      {children}
    </Badge>
  )
}

export function Dot({ tone, label }: { tone: Tone; label?: string }) {
  const dot = <span className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", dotClass[tone])} aria-label={label} />
  if (!label) return dot
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex h-5 w-4 items-center justify-center">{dot}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{label}</TooltipContent>
    </Tooltip>
  )
}

/** Tone of a GitHub Actions run or job. */
export function runTone(status?: string | null, conclusion?: string | null): Tone {
  if (status && status !== "completed") return "running"
  switch (conclusion) {
    case "success":
      return "ok"
    case "failure":
    case "timed_out":
    case "startup_failure":
      return "bad"
    case "action_required":
      return "warn"
    default:
      return "neutral"
  }
}

export function runLabel(status?: string | null, conclusion?: string | null): string {
  if (status && status !== "completed") return status === "queued" ? "queued" : "running"
  return (conclusion || "unknown").replace("_", " ")
}

export function ExtLink({ href, children, className }: { href?: string | null; children: React.ReactNode; className?: string }) {
  if (!href) return <span className={className}>{children}</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn("underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none", className)}
    >
      {children}
    </a>
  )
}

export function OpenButton({ href, label }: { href?: string | null; label: string }) {
  if (!href) return null
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground" asChild>
      <a href={href} target="_blank" rel="noreferrer" aria-label={label}>
        <ArrowUpRight className="h-4 w-4" />
      </a>
    </Button>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
}

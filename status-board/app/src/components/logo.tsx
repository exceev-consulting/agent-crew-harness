import { cn } from "@/lib/utils"

/** Two letters of the project name ("my-project" → "MP") on a rounded tile: no project artwork in the template. */
export function initials(project: string): string {
  const words = project.split(/[^A-Za-z0-9]+/).filter(Boolean)
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)
  return letters.toUpperCase()
}

export function Logo({ project, className }: { project: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={project}
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-[28%] bg-foreground font-mono text-sm font-semibold tracking-tight text-background",
        className,
      )}
    >
      {initials(project)}
    </div>
  )
}

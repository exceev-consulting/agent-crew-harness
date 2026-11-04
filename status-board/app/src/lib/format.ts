const dateTime = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
const timeOnly = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" })
const dayShort = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" })

export function when(iso?: string | null): string {
  return iso ? dateTime.format(new Date(iso)) : "—"
}

export function clock(iso?: string | null): string {
  return iso ? timeOnly.format(new Date(iso)) : "—"
}

export function day(isoDate: string): string {
  return dayShort.format(new Date(isoDate + "T12:00:00"))
}

/** "3 h ago", "in 2 d", "just now" */
export function rel(iso?: string | null, now = Date.now()): string {
  if (!iso) return "—"
  const diff = new Date(iso).getTime() - now
  const abs = Math.abs(diff)
  const min = Math.round(abs / 60000)
  let text: string
  if (min < 1) return "just now"
  if (min < 60) text = `${min} min`
  else if (min < 60 * 36) text = `${Math.round(min / 60)} h`
  else text = `${Math.round(min / 1440)} d`
  return diff < 0 ? `${text} ago` : `in ${text}`
}

export function plural(n: number, one: string, many = one + "s"): string {
  return `${n} ${n === 1 ? one : many}`
}

/** 95 → "1 min 35 s", 40 → "40 s" */
export function secs(s?: number | null): string {
  if (s == null) return "—"
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  const r = Math.round(s % 60)
  return r ? `${m} min ${r} s` : `${m} min`
}

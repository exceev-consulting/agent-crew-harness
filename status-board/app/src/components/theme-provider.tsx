import { createContext, useContext, useEffect, useState } from "react"

export type Theme = "light" | "dark" | "system"
const KEY = "status-board-theme"

function readStored(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === "light" || v === "dark" || v === "system") return v
  } catch {
    /* storage blocked: fall back to system */
  }
  return "system"
}

/** The viewer's own choice (data-theme on the root) wins over the OS setting. */
function systemTheme(): "light" | "dark" {
  const forced = document.documentElement.getAttribute("data-theme")
  if (forced === "light" || forced === "dark") return forced
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? systemTheme() : theme
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(resolved)
}

/** Run before the first render so the page never flashes the wrong theme. */
export function initTheme() {
  applyTheme(readStored())
}

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: "system",
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStored)

  useEffect(() => {
    applyTheme(theme)
    if (theme !== "system") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => applyTheme("system")
    media.addEventListener("change", onChange)
    const observer = new MutationObserver(onChange)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
    return () => {
      media.removeEventListener("change", onChange)
      observer.disconnect()
    }
  }, [theme])

  const setTheme = (t: Theme) => {
    try {
      localStorage.setItem(KEY, t)
    } catch {
      /* not remembered, still applied */
    }
    setThemeState(t)
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)

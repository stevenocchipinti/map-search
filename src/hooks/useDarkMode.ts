import { useSyncExternalStore } from "react"

const query = "(prefers-color-scheme: dark)"

function subscribe(callback: () => void): () => void {
  const mql = window.matchMedia(query)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSnapshot(): boolean {
  return window.matchMedia(query).matches
}

function getServerSnapshot(): boolean {
  return false
}

/**
 * Returns true when the OS prefers dark color scheme.
 * Reactively updates when the user changes their OS setting.
 */
export function useDarkMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

import { useState, useEffect } from "react"
import type { AustralianState } from "../types"

export interface RecentSearch {
  displayName: string
  lat: number
  lng: number
  state: AustralianState
  timestamp: number
}

const STORAGE_KEY = "recentSearches"
const MAX_ENTRIES = 50

function loadRecents(): RecentSearch[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored) as RecentSearch[]
    return parsed.sort((a, b) => b.timestamp - a.timestamp)
  } catch {
    return []
  }
}

function saveRecents(recents: RecentSearch[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recents))
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Hook to manage recent searches in localStorage.
 * Deduplicates by displayName (case-insensitive).
 * Excludes GPS/geolocation searches.
 */
export function useRecentSearches() {
  const [recents, setRecents] = useState<RecentSearch[]>(loadRecents)

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setRecents(loadRecents())
      }
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  const addRecent = (search: Omit<RecentSearch, "timestamp">) => {
    setRecents((prev) => {
      // Remove existing entry with same displayName (case-insensitive)
      const filtered = prev.filter(
        (r) =>
          r.displayName.toLowerCase() !== search.displayName.toLowerCase()
      )
      const updated = [
        { ...search, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_ENTRIES)
      saveRecents(updated)
      return updated
    })
  }

  const removeRecent = (displayName: string) => {
    setRecents((prev) => {
      const updated = prev.filter(
        (r) => r.displayName.toLowerCase() !== displayName.toLowerCase()
      )
      saveRecents(updated)
      return updated
    })
  }

  const clearRecents = () => {
    setRecents([])
    localStorage.removeItem(STORAGE_KEY)
  }

  return { recents, addRecent, removeRecent, clearRecents }
}

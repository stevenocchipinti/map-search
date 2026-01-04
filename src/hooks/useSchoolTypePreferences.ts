/**
 * Hook for managing school type preferences
 *
 * Persists school type selections (Primary/Secondary/Combined) to localStorage
 */

import { useState, useEffect } from "react"
import type { SchoolType } from "../types"

const STORAGE_KEY = "schoolTypes"
const DEFAULT_TYPES: SchoolType[] = ["Primary", "Secondary", "Combined"]

interface SchoolTypePreferencesResult {
  schoolTypes: Set<SchoolType>
  toggleSchoolType: (type: SchoolType) => void
  hasAnyTypeSelected: boolean
}

export function useSchoolTypePreferences(): SchoolTypePreferencesResult {
  const [schoolTypes, setSchoolTypes] = useState<Set<SchoolType>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as SchoolType[]
        return new Set(parsed)
      }
    } catch (error) {
      console.error("Failed to load school type preferences:", error)
    }
    return new Set(DEFAULT_TYPES)
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...schoolTypes]))
    } catch (error) {
      console.error("Failed to save school type preferences:", error)
    }
  }, [schoolTypes])

  const toggleSchoolType = (type: SchoolType) => {
    setSchoolTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        // Prevent removing all types
        if (next.size > 1) {
          next.delete(type)
        }
      } else {
        next.add(type)
      }
      return next
    })
  }

  return {
    schoolTypes,
    toggleSchoolType,
    hasAnyTypeSelected: schoolTypes.size > 0,
  }
}

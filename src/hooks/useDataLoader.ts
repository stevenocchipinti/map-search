/**
 * Hook for loading and managing state-based data files
 *
 * Loads schools and stations data on-demand per Australian state,
 * caches in memory for the session, and provides filtering utilities.
 */

import { useState, useCallback, useEffect, useRef } from "react"
import type { AustralianState, School, Station } from "../types"

interface DataLoaderResult {
  loadedStates: Set<AustralianState>
  loading: boolean
  error: string | null
  loadState: (
    state: AustralianState
  ) => Promise<{ schools: School[]; stations: Station[] }>
  loadMultipleStates: (states: AustralianState[]) => Promise<void>
  getSchools: (state: AustralianState) => School[]
  getStations: (state: AustralianState) => Station[]
  isStateLoaded: (state: AustralianState) => boolean
  clearCache: () => void
}

export function useDataLoader(): DataLoaderResult {
  const [loadedStates, setLoadedStates] = useState<Set<AustralianState>>(
    new Set()
  )
  const [schoolsData, setSchoolsData] = useState<
    Map<AustralianState, School[]>
  >(new Map())
  const [stationsData, setStationsData] = useState<
    Map<AustralianState, Station[]>
  >(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedStatesRef = useRef(loadedStates)
  const schoolsDataRef = useRef(schoolsData)
  const stationsDataRef = useRef(stationsData)

  useEffect(() => {
    loadedStatesRef.current = loadedStates
  }, [loadedStates])

  useEffect(() => {
    schoolsDataRef.current = schoolsData
  }, [schoolsData])

  useEffect(() => {
    stationsDataRef.current = stationsData
  }, [stationsData])

  const loadState = useCallback(
    async (
      state: AustralianState
    ): Promise<{ schools: School[]; stations: Station[] }> => {
      // Skip if already loaded
      if (loadedStatesRef.current.has(state)) {
        return {
          schools: schoolsDataRef.current.get(state) || [],
          stations: stationsDataRef.current.get(state) || [],
        }
      }

      setLoading(true)
      setError(null)

      try {
        const stateCode = state.toLowerCase()

        const loadDataset = async <T,>(
          dataset: "schools" | "stations"
        ): Promise<T[]> => {
          const response = await fetch(`/data/${stateCode}/${dataset}.json`)
          const contentType = response.headers.get("content-type") || ""

          if (response.status === 404) {
            console.warn(`No ${dataset} data packaged for ${state}`)
            return []
          }

          if (!response.ok) {
            throw new Error(
              `Failed to load ${dataset} for ${state}: ${response.statusText}`
            )
          }

          if (!contentType.includes("application/json")) {
            console.warn(
              `Skipping ${dataset} for ${state}: expected JSON but received ${contentType || "unknown content type"}`
            )
            return []
          }

          return response.json() as Promise<T[]>
        }

        // Load schools and stations in parallel
        const [schools, stations] = await Promise.all([
          loadDataset<School>("schools"),
          loadDataset<Station>("stations"),
        ])

        // Update state data maps
        setSchoolsData(prev => new Map(prev).set(state, schools))
        setStationsData(prev => new Map(prev).set(state, stations))
        setLoadedStates(prev => new Set(prev).add(state))

        console.log(`Loaded ${state} data:`, {
          schools: schools.length,
          stations: stations.length,
        })

        return { schools, stations }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to load state data"
        console.error("Data loading error:", err)
        setError(errorMsg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const loadMultipleStates = useCallback(
    async (states: AustralianState[]): Promise<void> => {
      const unloadedStates = states.filter(state => !loadedStates.has(state))

      if (unloadedStates.length === 0) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        await Promise.all(unloadedStates.map(state => loadState(state)))
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to load multiple states"
        console.error("Multiple states loading error:", err)
        setError(errorMsg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [loadedStates, loadState]
  )

  const getSchools = useCallback(
    (state: AustralianState): School[] => {
      return schoolsData.get(state) || []
    },
    [schoolsData]
  )

  const getStations = useCallback(
    (state: AustralianState): Station[] => {
      return stationsData.get(state) || []
    },
    [stationsData]
  )

  const isStateLoaded = useCallback(
    (state: AustralianState): boolean => {
      return loadedStates.has(state)
    },
    [loadedStates]
  )

  const clearCache = useCallback(() => {
    setLoadedStates(new Set())
    setSchoolsData(new Map())
    setStationsData(new Map())
    setError(null)
    console.log("Data cache cleared")
  }, [])

  return {
    loadedStates,
    loading,
    error,
    loadState,
    loadMultipleStates,
    getSchools,
    getStations,
    isStateLoaded,
    clearCache,
  }
}

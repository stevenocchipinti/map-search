/**
 * Hook for loading and managing state-based data files
 *
 * Loads schools, stations and supermarkets data on-demand per Australian state,
 * caches in memory for the session, and provides filtering utilities.
 */

import { useState, useCallback, useEffect, useRef } from "react"
import type { AustralianState, School, Station, Supermarket } from "../types"

interface StateData {
  schools: School[]
  stations: Station[]
  supermarkets: Supermarket[]
}

interface DataLoaderResult {
  loadedStates: Set<AustralianState>
  loading: boolean
  error: string | null
  loadState: (state: AustralianState) => Promise<StateData>
  loadMultipleStates: (states: AustralianState[]) => Promise<void>
  getSchools: (state: AustralianState) => School[]
  getStations: (state: AustralianState) => Station[]
  getSupermarkets: (state: AustralianState) => Supermarket[]
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
  const [supermarketsData, setSupermarketsData] = useState<
    Map<AustralianState, Supermarket[]>
  >(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedStatesRef = useRef(loadedStates)
  const schoolsDataRef = useRef(schoolsData)
  const stationsDataRef = useRef(stationsData)
  const supermarketsDataRef = useRef(supermarketsData)

  useEffect(() => {
    loadedStatesRef.current = loadedStates
  }, [loadedStates])

  useEffect(() => {
    schoolsDataRef.current = schoolsData
  }, [schoolsData])

  useEffect(() => {
    stationsDataRef.current = stationsData
  }, [stationsData])

  useEffect(() => {
    supermarketsDataRef.current = supermarketsData
  }, [supermarketsData])

  const loadState = useCallback(
    async (state: AustralianState): Promise<StateData> => {
      // Skip if already loaded
      if (loadedStatesRef.current.has(state)) {
        return {
          schools: schoolsDataRef.current.get(state) || [],
          stations: stationsDataRef.current.get(state) || [],
          supermarkets: supermarketsDataRef.current.get(state) || [],
        }
      }

      setLoading(true)
      setError(null)

      try {
        const stateCode = state.toLowerCase()

        const loadDataset = async <T,>(
          dataset: "schools" | "stations" | "supermarkets"
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

        // Load all datasets in parallel
        const [schools, stations, supermarkets] = await Promise.all([
          loadDataset<School>("schools"),
          loadDataset<Station>("stations"),
          loadDataset<Supermarket>("supermarkets"),
        ])

        // Update state data maps
        setSchoolsData(prev => new Map(prev).set(state, schools))
        setStationsData(prev => new Map(prev).set(state, stations))
        setSupermarketsData(prev => new Map(prev).set(state, supermarkets))
        setLoadedStates(prev => new Set(prev).add(state))

        console.log(`Loaded ${state} data:`, {
          schools: schools.length,
          stations: stations.length,
          supermarkets: supermarkets.length,
        })

        return { schools, stations, supermarkets }
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

  const getSupermarkets = useCallback(
    (state: AustralianState): Supermarket[] => {
      return supermarketsData.get(state) || []
    },
    [supermarketsData]
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
    setSupermarketsData(new Map())
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
    getSupermarkets,
    isStateLoaded,
    clearCache,
  }
}

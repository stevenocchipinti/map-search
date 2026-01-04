/**
 * Hook for geolocation functionality
 *
 * Provides "Use my location" feature with loading and error states
 */

import { useState } from "react"

interface GeolocationResult {
  location: GeolocationCoordinates | null
  loading: boolean
  error: string | null
  getCurrentLocation: () => Promise<GeolocationCoordinates | null>
}

export function useGeolocation(): GeolocationResult {
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getCurrentLocation =
    async (): Promise<GeolocationCoordinates | null> => {
      if (!navigator.geolocation) {
        const errorMsg = "Geolocation is not supported by your browser"
        setError(errorMsg)
        return null
      }

      setLoading(true)
      setError(null)

      return new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
          position => {
            setLocation(position.coords)
            setLoading(false)
            resolve(position.coords)
          },
          err => {
            let errorMsg = "Unable to get your location"

            switch (err.code) {
              case err.PERMISSION_DENIED:
                errorMsg = "Location permission denied"
                break
              case err.POSITION_UNAVAILABLE:
                errorMsg = "Location information unavailable"
                break
              case err.TIMEOUT:
                errorMsg = "Location request timed out"
                break
            }

            setError(errorMsg)
            setLoading(false)
            resolve(null)
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000, // Cache for 1 minute
          }
        )
      })
    }

  return {
    location,
    loading,
    error,
    getCurrentLocation,
  }
}

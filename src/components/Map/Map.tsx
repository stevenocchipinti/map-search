/**
 * Map Component
 *
 * Leaflet map container with Carto tiles for visualizing search results and walking routes.
 */

import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet"
import type { ReactNode } from "react"
import { useEffect, useRef } from "react"
import { point } from "leaflet"
import type { LatLngBounds, Point } from "leaflet"
import { useDarkMode } from "../../hooks/useDarkMode"

const LIGHT_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
const DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"

const SINGLE_TAP_DELAY_MS = 250
const DOUBLE_TAP_MAX_DELAY_MS = 300
const DOUBLE_TAP_MAX_DISTANCE_PX = 40
const DOUBLE_TAP_HOLD_MOVE_THRESHOLD_PX = 10
const DOUBLE_TAP_HOLD_ZOOM_SENSITIVITY_PX = 100
const SUPPRESS_DOUBLE_TAP_CLICK_MS = 400
const RESTORE_DOUBLE_TAP_ZOOM_DELAY_MS = 300

interface MapProps {
  center: [number, number]
  zoom: number
  bounds?: LatLngBounds | null
  children?: ReactNode
  onMapClick?: (lat: number, lng: number) => void
}

/**
 * MapClickHandler - Listens for click events on the map
 */
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  const map = useMap()
  const pendingClickTimeout = useRef<number | null>(null)
  const suppressClicksUntil = useRef(0)
  const lastTouchEnd = useRef<{ time: number; x: number; y: number } | null>(null)
  const restoreDoubleClickZoomTimeout = useRef<number | null>(null)
  const doubleTapHoldGesture = useRef<{
    active: boolean
    anchorPoint: Point
    startClientY: number
    startZoom: number
    zoomSnap: number
    draggingWasEnabled: boolean
    doubleClickZoomWasEnabled: boolean
  } | null>(null)

  const clearPendingClick = () => {
    if (pendingClickTimeout.current !== null) {
      window.clearTimeout(pendingClickTimeout.current)
      pendingClickTimeout.current = null
    }
  }

  useEffect(() => {
    const finishDoubleTapHoldGesture = () => {
      const gesture = doubleTapHoldGesture.current

      if (!gesture) {
        return
      }

      map.options.zoomSnap = gesture.zoomSnap

      if (gesture.draggingWasEnabled && !map.dragging.enabled()) {
        map.dragging.enable()
      }

      if (gesture.active && gesture.doubleClickZoomWasEnabled) {
        restoreDoubleClickZoomTimeout.current = window.setTimeout(() => {
          map.doubleClickZoom.enable()
          restoreDoubleClickZoomTimeout.current = null
        }, RESTORE_DOUBLE_TAP_ZOOM_DELAY_MS)
      }

      doubleTapHoldGesture.current = null
    }

    const container = map.getContainer()

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        lastTouchEnd.current = null
        finishDoubleTapHoldGesture()
        return
      }

      const touch = event.touches[0]
      const now = Date.now()
      const lastTap = lastTouchEnd.current

      const isSecondTap =
        lastTap !== null &&
        now - lastTap.time <= DOUBLE_TAP_MAX_DELAY_MS &&
        Math.hypot(touch.clientX - lastTap.x, touch.clientY - lastTap.y) <=
          DOUBLE_TAP_MAX_DISTANCE_PX

      if (!isSecondTap) {
        return
      }

      clearPendingClick()
      suppressClicksUntil.current = now + SUPPRESS_DOUBLE_TAP_CLICK_MS
      lastTouchEnd.current = null

      if (restoreDoubleClickZoomTimeout.current !== null) {
        window.clearTimeout(restoreDoubleClickZoomTimeout.current)
        restoreDoubleClickZoomTimeout.current = null
      }

      const bounds = container.getBoundingClientRect()
      const draggingWasEnabled = map.dragging.enabled()

      if (draggingWasEnabled) {
        map.dragging.disable()
      }

      doubleTapHoldGesture.current = {
        active: false,
        anchorPoint: point(touch.clientX - bounds.left, touch.clientY - bounds.top),
        startClientY: touch.clientY,
        startZoom: map.getZoom(),
        zoomSnap: map.options.zoomSnap ?? 1,
        draggingWasEnabled,
        doubleClickZoomWasEnabled: map.doubleClickZoom.enabled(),
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      const gesture = doubleTapHoldGesture.current

      if (!gesture || event.touches.length !== 1) {
        return
      }

      const touch = event.touches[0]
      const deltaY = touch.clientY - gesture.startClientY

      if (!gesture.active && Math.abs(deltaY) < DOUBLE_TAP_HOLD_MOVE_THRESHOLD_PX) {
        return
      }

      if (!gesture.active) {
        gesture.active = true
        map.options.zoomSnap = 0

        if (gesture.doubleClickZoomWasEnabled) {
          map.doubleClickZoom.disable()
        }
      }

      event.preventDefault()

      const targetZoom = Math.max(
        map.getMinZoom(),
        Math.min(map.getMaxZoom(), gesture.startZoom + deltaY / DOUBLE_TAP_HOLD_ZOOM_SENSITIVITY_PX)
      )

      if (targetZoom !== map.getZoom()) {
        map.setZoomAround(gesture.anchorPoint, targetZoom, { animate: false })
      }
    }

    const handleTouchEnd = (event: TouchEvent) => {
      if (doubleTapHoldGesture.current) {
        if (event.touches.length === 0) {
          finishDoubleTapHoldGesture()
        }

        return
      }

      if (event.touches.length !== 0 || event.changedTouches.length !== 1) {
        return
      }

      const touch = event.changedTouches[0]
      lastTouchEnd.current = {
        time: Date.now(),
        x: touch.clientX,
        y: touch.clientY,
      }
    }

    const handleTouchCancel = () => {
      lastTouchEnd.current = null
      finishDoubleTapHoldGesture()
    }

    container.addEventListener("touchstart", handleTouchStart, { passive: true })
    container.addEventListener("touchmove", handleTouchMove, { passive: false })
    container.addEventListener("touchend", handleTouchEnd, { passive: true })
    container.addEventListener("touchcancel", handleTouchCancel, { passive: true })

    return () => {
      clearPendingClick()

      if (restoreDoubleClickZoomTimeout.current !== null) {
        window.clearTimeout(restoreDoubleClickZoomTimeout.current)
        restoreDoubleClickZoomTimeout.current = null
      }

      finishDoubleTapHoldGesture()

      container.removeEventListener("touchstart", handleTouchStart)
      container.removeEventListener("touchmove", handleTouchMove)
      container.removeEventListener("touchend", handleTouchEnd)
      container.removeEventListener("touchcancel", handleTouchCancel)
    }
  }, [map])

  useMapEvents({
    click(e) {
      if (Date.now() < suppressClicksUntil.current) {
        return
      }

      clearPendingClick()

      pendingClickTimeout.current = window.setTimeout(() => {
        pendingClickTimeout.current = null
        onMapClick(e.latlng.lat, e.latlng.lng)
      }, SINGLE_TAP_DELAY_MS)
    },
    dblclick() {
      clearPendingClick()
    },
  })

  return null
}

/**
 * MapController - Updates map view when center/zoom/bounds change
 * This is needed because MapContainer only accepts center/zoom as initial props
 */
function MapController({
  center,
  zoom,
  bounds,
}: {
  center: [number, number]
  zoom: number
  bounds?: LatLngBounds | null
}) {
  const map = useMap()

  useEffect(() => {
    if (bounds) {
      // If bounds are provided, fit the map to show all POIs
      // Minimal padding and max zoom for testing
      map.fitBounds(bounds, { padding: [10, 10], maxZoom: 19 })
    } else {
      // Otherwise, just set center and zoom
      map.setView(center, zoom)
    }
  }, [map, center, zoom, bounds])

  return null
}

export function Map({ center, zoom, bounds, children, onMapClick }: MapProps) {
  const isDark = useDarkMode()

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: "100%", height: "100%" }}
      zoomControl={false}
      scrollWheelZoom={true}
      attributionControl={false}
    >
      <TileLayer
        key={isDark ? "dark" : "light"}
        url={isDark ? DARK_TILES : LIGHT_TILES}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />
      <MapController center={center} zoom={zoom} bounds={bounds} />
      {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
      {children}
    </MapContainer>
  )
}

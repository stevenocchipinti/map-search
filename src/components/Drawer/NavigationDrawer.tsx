import { useEffect } from "react"
import { Drawer } from "vaul"
import { DrawerTabBar } from "./DrawerTabBar"
import { DrawerDetails } from "./DrawerDetails"
import { DrawerAlternatives } from "./DrawerAlternatives"
import type { POI, POICategory, SelectedPOIs, WalkingRoute } from "../../types"

interface NavigationDrawerProps {
  // POI data
  schools: POI[]
  stations: POI[]
  supermarkets: POI[]

  // Selection
  selectedPOIs: SelectedPOIs
  onSelectPOI: (category: POICategory, index: number) => void

  // Routes
  schoolRoute?: WalkingRoute | null
  stationRoute?: WalkingRoute | null
  supermarketRoute?: WalkingRoute | null
  routeLoading: { school: boolean; station: boolean; supermarket: boolean }

  // Settings
  onOpenSettings: () => void

  // State control (passed from App.tsx)
  snapIndex: number
  onSnapIndexChange: (index: number) => void
  activeTab: POICategory
  onActiveTabChange: (tab: POICategory) => void
}

export function NavigationDrawer({
  schools,
  stations,
  supermarkets,
  selectedPOIs,
  onSelectPOI,
  schoolRoute,
  stationRoute,
  supermarketRoute,
  routeLoading,
  onOpenSettings,
  snapIndex,
  onSnapIndexChange,
  activeTab,
  onActiveTabChange,
}: NavigationDrawerProps) {
  // Tab click toggle behavior
  const handleTabClick = (category: POICategory) => {
    if (activeTab === category && snapIndex === 1) {
      // Tapping active tab at middle → collapse to lowest
      onSnapIndexChange(0)
    } else {
      // Different tab OR at lowest/highest → switch tab and go to middle
      onActiveTabChange(category)
      onSnapIndexChange(1)
    }
  }

  // Helper to get current category items
  const getCurrentItems = (): POI[] => {
    switch (activeTab) {
      case "school":
        return schools
      case "station":
        return stations
      case "supermarket":
        return supermarkets
    }
  }

  // Helper to get current route
  const getCurrentRoute = (): WalkingRoute | null | undefined => {
    switch (activeTab) {
      case "school":
        return schoolRoute
      case "station":
        return stationRoute
      case "supermarket":
        return supermarketRoute
    }
  }

  // Snap points: pixel-based for first two, fraction for last
  // Snap 0: ~90px (drag handle 26px + tab bar 64px)
  // Snap 1: ~300px (includes details section)
  // Snap 2: 0.85 (85% of viewport - full alternatives list)
  const snapPoints: (string | number)[] = ["75px", "300px", 0.85]
  const activeSnapPoint = snapPoints[snapIndex]

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      // Arrow Left/Right: Switch tabs
      if (e.key === "ArrowLeft") {
        const tabs: POICategory[] = ["school", "station", "supermarket"]
        const idx = tabs.indexOf(activeTab)
        onActiveTabChange(tabs[idx > 0 ? idx - 1 : 2])
      }

      if (e.key === "ArrowRight") {
        const tabs: POICategory[] = ["school", "station", "supermarket"]
        const idx = tabs.indexOf(activeTab)
        onActiveTabChange(tabs[idx < 2 ? idx + 1 : 0])
      }

      // Arrow Up: Expand drawer
      if (e.key === "ArrowUp" && snapIndex < 2) {
        e.preventDefault()
        onSnapIndexChange(snapIndex + 1)
      }

      // Arrow Down: Collapse drawer
      if (e.key === "ArrowDown" && snapIndex > 0) {
        e.preventDefault()
        onSnapIndexChange(snapIndex - 1)
      }

      // Escape: Collapse to lowest
      if (e.key === "Escape" && snapIndex > 0) {
        onSnapIndexChange(0)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeTab, snapIndex, onActiveTabChange, onSnapIndexChange])

  // Focus management
  useEffect(() => {
    if (snapIndex === 1) {
      // Focus on details when expanded to middle
      const detailsPanel = document.querySelector('[role="tabpanel"]')
      if (detailsPanel instanceof HTMLElement) {
        detailsPanel.focus()
      }
    }
  }, [snapIndex])

  return (
    <Drawer.Root
      open={true}
      modal={false}
      dismissible={false}
      snapPoints={snapPoints}
      activeSnapPoint={activeSnapPoint}
      setActiveSnapPoint={snapPoint => {
        // Convert snap point back to index
        if (snapPoint === null) return
        const index = snapPoints.indexOf(snapPoint)
        if (index !== -1) {
          onSnapIndexChange(index)
        }
      }}
      fadeFromIndex={1}
    >
      <Drawer.Overlay className="fixed inset-0 z-[1002] bg-black/20" />
      <Drawer.Portal>
        <Drawer.Content
          className="fixed drop-shadow-[0_0_8px_rgba(0,0,0,0.2)] inset-x-0 bottom-0 z-[1003] flex flex-col bg-white rounded-t-3xl"
          style={{ height: "100%" }}
        >
          {/* Drag handle - always visible */}
          <div
            role="separator"
            aria-label="Drag to expand or collapse navigation"
            aria-orientation="vertical"
            className="pt-2 flex justify-center"
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          {/* Tab bar - always visible */}
          <DrawerTabBar
            activeTab={activeTab}
            onTabClick={handleTabClick}
            schools={schools}
            stations={stations}
            supermarkets={supermarkets}
            selectedPOIs={selectedPOIs}
            schoolRoute={schoolRoute}
            stationRoute={stationRoute}
            supermarketRoute={supermarketRoute}
          />

          {/* Details section - visible at snap 1+ */}
          <DrawerDetails
            activeTab={activeTab}
            items={getCurrentItems()}
            selectedIndex={selectedPOIs[activeTab]}
            route={getCurrentRoute()}
            routeLoading={routeLoading[activeTab]}
            onOpenSettings={onOpenSettings}
            hasAlternatives={getCurrentItems().length > 1}
          />

          {/* Alternatives list - visible at snap 2 */}
          <DrawerAlternatives
            activeTab={activeTab}
            items={getCurrentItems()}
            selectedIndex={selectedPOIs[activeTab]}
            onSelectItem={index => {
              onSelectPOI(activeTab, index)
              onSnapIndexChange(1) // Auto-collapse to middle
            }}
          />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

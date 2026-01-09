import { useState, useEffect, useRef } from "react"
import { Info } from "lucide-react"

interface AttributionToggleProps {
  hasSearched?: boolean
  isLanding?: boolean
}

export function AttributionToggle({
  hasSearched = false,
  isLanding = false,
}: AttributionToggleProps) {
  // Start expanded, collapse after first search
  const [isExpanded, setIsExpanded] = useState(true)
  // Track if we've already auto-collapsed to prevent re-collapsing when user expands
  const hasAutoCollapsedRef = useRef(false)

  // Auto-collapse when search happens (only once)
  useEffect(() => {
    if (hasSearched && isExpanded && !hasAutoCollapsedRef.current) {
      hasAutoCollapsedRef.current = true
      setIsExpanded(false)
    }
  }, [hasSearched, isExpanded])

  return (
    <div
      className={`fixed bottom-[96px] z-[950] ${
        isLanding
          ? "left-1/2 -translate-x-1/2 landing-attribution"
          : "right-4 floating-attribution"
      }`}
    >
      <div className="flex items-center justify-end">
        {/* Combined container with conditional background */}
        <div
          className={`flex items-center backdrop-blur-sm rounded-full shadow-lg h-8 overflow-hidden ${
            isLanding ? "bg-stone-800/40" : "bg-white/95"
          }`}
        >
          {/* Text container - slides in/out */}
          <div
            className={`flex items-center overflow-hidden transition-all duration-300 ease-out ${
              isExpanded
                ? "max-w-[400px] opacity-100 pl-3 pr-2"
                : "max-w-0 opacity-0 pl-0 pr-0"
            }`}
          >
            <div
              className={`text-xs whitespace-nowrap ${
                isLanding ? "text-stone-100" : "text-gray-700"
              }`}
            >
              {isLanding ? (
                // Dark theme for landing (centered view)
                <>
                  <a
                    href="https://leafletjs.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-300 hover:text-white font-semibold transition-colors"
                  >
                    Leaflet
                  </a>{" "}
                  <span className="text-stone-400">|</span> ©{" "}
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-300 hover:text-white font-semibold transition-colors"
                  >
                    OpenStreetMap
                  </a>{" "}
                  contributors <span className="text-stone-400">|</span> ©{" "}
                  <a
                    href="https://carto.com/attributions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-300 hover:text-white font-semibold transition-colors"
                  >
                    CARTO
                  </a>
                </>
              ) : (
                // Light theme for floating (corner view)
                <>
                  <a
                    href="https://leafletjs.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 font-semibold transition-colors"
                  >
                    Leaflet
                  </a>{" "}
                  <span className="text-gray-400">|</span> ©{" "}
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 font-semibold transition-colors"
                  >
                    OpenStreetMap
                  </a>{" "}
                  contributors <span className="text-gray-400">|</span> ©{" "}
                  <a
                    href="https://carto.com/attributions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 font-semibold transition-colors"
                  >
                    CARTO
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Icon button - stays in place */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex-shrink-0 w-8 h-8 transition-colors duration-200 flex items-center justify-center rounded-full ${
              isLanding
                ? "hover:bg-stone-700/50 active:bg-stone-600/50"
                : "hover:bg-gray-50 active:bg-gray-100"
            }`}
            aria-label={
              isExpanded ? "Collapse attribution" : "Show map attribution"
            }
          >
            <Info
              className={`w-5 h-5 ${isLanding ? "text-stone-300" : "text-gray-600"}`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

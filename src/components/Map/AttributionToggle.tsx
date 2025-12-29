import { useState, useEffect, useRef } from "react"
import { Info } from "lucide-react"

interface AttributionToggleProps {
  hasSearched?: boolean
}

export function AttributionToggle({ hasSearched = false }: AttributionToggleProps) {
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
      className="fixed right-4 bottom-[96px] z-[999]"
    >
      <div className="flex items-center justify-end">
        {/* Combined container with unified background */}
        <div className="flex items-center bg-white/95 backdrop-blur-sm rounded-full shadow-lg h-8 overflow-hidden">
          {/* Text container - slides in/out */}
          <div 
            className={`flex items-center overflow-hidden transition-all duration-300 ease-out ${
              isExpanded ? 'max-w-[400px] opacity-100 pl-3 pr-2' : 'max-w-0 opacity-0 pl-0 pr-0'
            }`}
          >
            <div className="text-xs text-gray-600 whitespace-nowrap">
              <a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Leaflet</a> | © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenStreetMap</a> contributors | © <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">CARTO</a>
            </div>
          </div>
          
          {/* Icon button - stays in place */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 w-8 h-8 hover:bg-gray-50 active:bg-gray-100 transition-colors duration-200 flex items-center justify-center rounded-full"
            aria-label={isExpanded ? "Collapse attribution" : "Show map attribution"}
          >
            <Info className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  )
}

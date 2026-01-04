import type { POI } from "../../types"
import { formatDistance } from "../../utils/format"

interface POIAlternativesProps {
  items: POI[]
  selectedIndex: number
  onSelect: (index: number) => void
}

export function POIAlternatives({
  items,
  selectedIndex,
  onSelect,
}: POIAlternativesProps) {
  const alternatives = items.filter((_, index) => index !== selectedIndex)

  if (alternatives.length === 0) {
    return null
  }

  return (
    <div className="bg-white">
      <div className="overflow-y-auto">
        {alternatives.map(item => {
          // Find original index
          const originalIndex = items.findIndex(i => i === item)

          return (
            <button
              key={originalIndex}
              onClick={() => onSelect(originalIndex)}
              className="w-full px-5 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-50 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                    {item.name}
                  </p>
                  {item.details && (
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {item.details}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex-shrink-0 text-xs text-gray-600 font-medium bg-gray-100 px-2 py-1 rounded-lg">
                    {formatDistance(item.distance)}
                  </span>
                  <svg
                    className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

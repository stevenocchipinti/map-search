import { flushSync } from "react-dom"
import type { RecentSearch } from "../../hooks/useRecentSearches"

interface RecentSearchesProps {
  recents: RecentSearch[]
  expanded: boolean
  onToggle: () => void
  onSelect: (recent: RecentSearch) => void
  onRemove: (displayName: string) => void
  searchValue?: string
  onClearSearch?: () => void
}

/**
 * Wrap a state change in a view transition if supported (same pattern as App.tsx)
 */
function withViewTransition(callback: () => void) {
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      flushSync(callback)
    })
  } else {
    callback()
  }
}

/**
 * A "Recent" pill button that expands into a scrollable list of recent searches.
 * Only renders if there are recents to show.
 */
export function RecentSearches({
  recents,
  expanded,
  onToggle,
  onSelect,
  onRemove,
  searchValue = "",
  onClearSearch,
}: RecentSearchesProps) {
  const hasRecents = recents.length > 0
  const showClear = searchValue.trim().length > 0 && !expanded

  if (!hasRecents && !showClear) return null

  const handleToggle = () => {
    withViewTransition(onToggle)
  }

  return (
    <div className="w-full">
      {/* Pills row (collapsed state) */}
      {!expanded && (
        <div className="flex items-center gap-2">
          {hasRecents && (
            <button
              onClick={handleToggle}
              className="recent-searches inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-gray-900 shadow-lg text-xs font-medium text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <svg
                className="recent-searches-icon w-3 h-3 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="recent-searches-label">Recent searches</span>
            </button>
          )}
          {onClearSearch && (
            <button
              onClick={onClearSearch}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-gray-900 shadow-lg text-xs font-medium text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-opacity duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${showClear ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              tabIndex={showClear ? 0 : -1}
            >
              <svg
                className="w-3 h-3 text-gray-400 dark:text-gray-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Clear
            </button>
          )}
        </div>
      )}

      {/* Expanded list */}
      {expanded && (
        <div className="recent-searches bg-white dark:bg-gray-900 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden">
          {/* Header - matches pill styling for smooth transition */}
          <div className="flex items-center justify-between px-2.5 pt-1 pb-0">
            <button
              onClick={handleToggle}
              className="inline-flex items-center gap-1 cursor-pointer"
            >
              <svg
                className="recent-searches-icon w-3 h-3 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="recent-searches-label text-xs font-medium text-gray-500 dark:text-gray-500">
                Recent searches
              </span>
            </button>
            <button
              onClick={handleToggle}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
              aria-label="Close recent searches"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Scrollable list */}
          <div className="max-h-[60vh] overflow-y-auto p-1">
            {recents.map(recent => (
              <div
                key={recent.displayName}
                className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors "
              >
                <button
                  className="flex-1 text-left text-sm text-gray-800 dark:text-gray-200 truncate"
                  onClick={() => onSelect(recent)}
                >
                  {recent.displayName}
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onRemove(recent.displayName)
                  }}
                  className="flex-shrink-0 text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 transition-colors p-1"
                  aria-label={`Remove ${recent.displayName}`}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

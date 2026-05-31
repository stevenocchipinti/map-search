import { Logo } from "../UI/Logo"
import { FloatingSearchBar } from "./FloatingSearchBar"
import type { RecentSearch } from "../../hooks/useRecentSearches"

interface LandingOverlayProps {
  value: string
  onChange: (value: string) => void
  onSearch: (address: string) => void
  onUseLocation: () => void
  onOpenSettings: () => void
  onDismiss?: () => void
  loading?: boolean
  recents?: RecentSearch[]
  onShowRecents?: () => void
}

export function LandingOverlay({
  value,
  onChange,
  onSearch,
  onUseLocation,
  onOpenSettings,
  onDismiss,
  loading = false,
  recents = [],
  onShowRecents,
}: LandingOverlayProps) {
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only dismiss if clicking the backdrop itself, not children
    if (e.target === e.currentTarget && onDismiss) {
      onDismiss()
    }
  }

  return (
    <div
      className="landing-overlay fixed inset-0 z-[900] flex flex-col items-center justify-center bg-black/70 px-6"
      onClick={handleBackdropClick}
    >
      {/* Branding section */}
      <div className="landing-logo flex flex-col items-center mb-10">
        {/* Logo - white, larger */}
        <Logo
          size={96}
          color="white"
          className="mb-6 drop-shadow-[0_0_24px_rgba(0,0,0,1)]"
        />

        {/* Title */}
        <h1 className="text-white text-3xl font-semibold tracking-tight mb-2">
          Local Search
        </h1>

        {/* Subtitle */}
        <p className="text-white/70 text-sm font-normal">
          Find the important stuff nearby
        </p>
      </div>

      {/* Search bar using FloatingSearchBar component */}
      <FloatingSearchBar
        value={value}
        onChange={onChange}
        onSearch={onSearch}
        onUseLocation={onUseLocation}
        onOpenSettings={onOpenSettings}
        loading={loading}
        autoFocus={true}
        className="landing-search-bar !relative !left-0 !right-0 w-full max-w-full"
      />

      {/* Recent searches pill - transitions to map screen with recents open */}
      {recents.length > 0 && onShowRecents && (
        <div className="w-full max-w-full mt-6 px-4">
          <button
            onClick={onShowRecents}
            className="recent-searches inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-gray-900 shadow-lg text-xs font-medium text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <svg
              className="w-3 h-3 text-gray-400 dark:text-gray-500"
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
            Recent searches
          </button>
        </div>
      )}
    </div>
  )
}

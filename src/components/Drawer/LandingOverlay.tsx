import { Logo } from "../UI/Logo"
import { FloatingSearchBar } from "./FloatingSearchBar"
import { RecentSearches } from "../Sidebar/RecentSearches"
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
  onClearSearch?: () => void
  searchFocused?: boolean
  onFocus?: () => void
  onBlur?: () => void
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
  onClearSearch,
  searchFocused = false,
  onFocus,
  onBlur,
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
        onFocus={onFocus}
        onBlur={onBlur}
      />

      {/* Recent searches / clear pill */}
      <div className="w-full max-w-full mt-6 px-4">
        <RecentSearches
          recents={recents}
          expanded={false}
          onToggle={() => onShowRecents?.()}
          onSelect={() => {}}
          onRemove={() => {}}
          searchValue={value}
          onClearSearch={onClearSearch}
          searchFocused={searchFocused}
        />
      </div>
    </div>
  )
}

import { Logo } from "../UI/Logo"
import { FloatingSearchBar } from "./FloatingSearchBar"

interface LandingOverlayProps {
  value: string
  onChange: (value: string) => void
  onSearch: (address: string) => void
  onUseLocation: () => void
  onOpenSettings: () => void
  loading?: boolean
}

export function LandingOverlay({
  value,
  onChange,
  onSearch,
  onUseLocation,
  onOpenSettings,
  loading = false,
}: LandingOverlayProps) {
  return (
    <div 
      className="landing-overlay fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-black/70 px-6"
    >
      {/* Branding section */}
      <div className="landing-logo flex flex-col items-center mb-10">
        {/* Logo - white, larger */}
        <Logo size={96} color="white" className="mb-6" />
        
        {/* Title */}
        <h1 className="text-white text-2xl font-semibold tracking-tight mb-2">
          Local Search
        </h1>
        
        {/* Subtitle */}
        <p className="text-white/70 text-sm font-normal">
          Find the important stuff in your area
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
    </div>
  )
}

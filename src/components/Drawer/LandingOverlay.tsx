import { useState, useEffect, useRef } from "react"
import { Search, MapPin, Loader2 } from "lucide-react"
import { Logo } from "../UI/Logo"

interface LandingOverlayProps {
  onSearch: (address: string) => void
  onUseLocation: () => void
  loading?: boolean
}

export function LandingOverlay({
  onSearch,
  onUseLocation,
  loading = false,
}: LandingOverlayProps) {
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount
  useEffect(() => {
    // Small delay to ensure the element is fully rendered
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()

    if (inputValue.trim()) {
      onSearch(inputValue)
    } else {
      onUseLocation()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit()
    }
  }

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

      {/* Search bar - centered, matches FloatingSearchBar width */}
      <div className="landing-search-bar w-[calc(100%-2rem)] max-w-[calc(100%-2rem)]">
        <div className="bg-white rounded-full shadow-lg p-2 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            id="landing-address-search"
            name="address"
            autoComplete="street-address"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search address..."
            className="flex-1 px-4 py-2 text-sm focus:outline-none bg-transparent"
            aria-label="Search address"
            disabled={loading}
          />

          <button
            onClick={() => handleSubmit()}
            disabled={loading}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition-colors duration-200 flex items-center justify-center disabled:opacity-50"
            aria-label={inputValue.trim() ? "Search" : "Use current location"}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : inputValue.trim() ? (
              <Search className="w-5 h-5" />
            ) : (
              <MapPin className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

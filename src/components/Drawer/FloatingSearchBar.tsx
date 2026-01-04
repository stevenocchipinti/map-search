import { Search, MapPin, Loader2, Settings2 } from "lucide-react"
import { useEffect, useRef } from "react"

interface FloatingSearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: (address: string) => void
  onUseLocation: () => void
  onOpenSettings: () => void
  loading?: boolean
  className?: string
  autoFocus?: boolean
}

export function FloatingSearchBar({
  value,
  onChange,
  onSearch,
  onUseLocation,
  onOpenSettings,
  loading,
  className = "",
  autoFocus = false,
}: FloatingSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount if autoFocus is true
  useEffect(() => {
    if (autoFocus) {
      // Small delay to ensure the element is fully rendered
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [autoFocus])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()

    if (value.trim()) {
      onSearch(value)
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
      className={`fixed left-4 right-4 z-[1000] floating-search-bar ${className}`}
    >
      <div className="bg-white rounded-full shadow-lg p-2 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          id="floating-address-search"
          name="address"
          autoComplete="street-address"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search address..."
          className="flex-1 px-4 py-2 text-sm focus:outline-none bg-transparent"
          aria-label="Search address"
          disabled={loading}
        />

        <button
          onClick={onOpenSettings}
          disabled={loading}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition-colors duration-200 flex items-center justify-center disabled:opacity-50"
          aria-label="Settings"
        >
          <Settings2 className="w-5 h-5" />
        </button>

        <button
          onClick={() => handleSubmit()}
          disabled={loading}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition-colors duration-200 flex items-center justify-center disabled:opacity-50"
          aria-label={value.trim() ? "Search" : "Use current location"}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : value.trim() ? (
            <Search className="w-5 h-5" />
          ) : (
            <MapPin className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  )
}

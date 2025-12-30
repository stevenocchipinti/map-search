import { useState } from "react"
import { Search, MapPin, Loader2, Settings2 } from "lucide-react"

interface FloatingSearchBarProps {
  onSearch: (address: string) => void
  onUseLocation: () => void
  onOpenSettings: () => void
  loading?: boolean
  className?: string
}

export function FloatingSearchBar({
  onSearch,
  onUseLocation,
  onOpenSettings,
  loading,
  className = "",
}: FloatingSearchBarProps) {
  const [inputValue, setInputValue] = useState("")

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
      className={`fixed left-4 right-4 z-[1000] floating-search-bar ${className}`}
    >
      <div className="bg-white rounded-full shadow-lg p-2 flex items-center gap-2">
        <input
          type="text"
          id="floating-address-search"
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
  )
}

import { Button } from '../UI/Button';
import { LoadingSpinner } from '../UI/LoadingSpinner';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (address: string) => void;
  onUseLocation: () => void;
  loading?: boolean;
  error?: string | null;
}

export function SearchBar({ 
  value,
  onChange,
  onSearch, 
  onUseLocation, 
  loading, 
  error 
}: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSearch(value.trim());
    }
  };

  return (
    <div className="p-5 bg-white border-b border-gray-100">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            id="address-search"
            name="address"
            autoComplete="street-address"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter an address..."
            className="w-full px-4 py-3.5 pr-12 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
            disabled={loading}
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <LoadingSpinner size="sm" />
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-sm text-red-600 px-1 font-medium">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="flex-1 h-12"
            disabled={!value.trim() || loading}
          >
            <span className="font-medium">Search</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="h-12"
            onClick={onUseLocation}
            disabled={loading}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          >
            <span className="hidden sm:inline font-medium">Use Location</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

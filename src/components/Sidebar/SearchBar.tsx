import { useState } from 'react';
import { Button } from '../UI/Button';
import { LoadingSpinner } from '../UI/LoadingSpinner';

interface SearchBarProps {
  onSearch: (address: string) => void;
  onUseLocation: () => void;
  loading?: boolean;
  error?: string | null;
}

export function SearchBar({ onSearch, onUseLocation, loading, error }: SearchBarProps) {
  const [address, setAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      onSearch(address.trim());
    }
  };

  return (
    <div className="p-4 bg-white border-b border-gray-200">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter an address..."
            className="w-full px-4 py-3 pr-12 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
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
          <div className="text-sm text-red-600 px-1">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="flex-1"
            disabled={!address.trim() || loading}
          >
            Search
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onUseLocation}
            disabled={loading}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          >
            <span className="hidden sm:inline">Use Location</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

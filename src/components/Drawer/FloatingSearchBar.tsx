import { useState } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';

interface FloatingSearchBarProps {
  onSearch: (address: string) => void;
  onUseLocation: () => void;
  loading?: boolean;
  className?: string;
}

export function FloatingSearchBar({
  onSearch,
  onUseLocation,
  loading,
  className = '',
}: FloatingSearchBarProps) {
  const [inputValue, setInputValue] = useState('');
  
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (inputValue.trim()) {
      onSearch(inputValue);
    } else {
      onUseLocation();
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };
  
  return (
    <div className={`fixed left-4 right-4 bottom-24 z-40 ${className}`}>
      <div className="bg-white rounded-full shadow-soft-lg p-2 flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search address..."
          className="flex-1 px-4 py-2 text-sm focus:outline-none bg-transparent"
          aria-label="Search address"
          disabled={loading}
        />
        
        <button
          onClick={() => handleSubmit()}
          disabled={loading}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors duration-200 flex items-center justify-center disabled:opacity-50 shadow-soft"
          aria-label={inputValue.trim() ? 'Search' : 'Use current location'}
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
  );
}

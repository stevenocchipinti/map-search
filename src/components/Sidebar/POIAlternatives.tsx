import type { POI } from '../../types';
import { formatDistance } from '../../utils/format';

interface POIAlternativesProps {
  items: POI[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function POIAlternatives({ items, selectedIndex, onSelect }: POIAlternativesProps) {
  const alternatives = items.filter((_, index) => index !== selectedIndex);

  if (alternatives.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50">
      <div className="max-h-64 overflow-y-auto">
        {alternatives.map((item) => {
          // Find original index
          const originalIndex = items.findIndex((i) => i === item);
          
          return (
            <button
              key={originalIndex}
              onClick={() => onSelect(originalIndex)}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-blue-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {item.name}
                  </p>
                  {item.details && (
                    <p className="text-xs text-gray-600 mt-0.5 truncate">
                      {item.details}
                    </p>
                  )}
                </div>
                <span className="flex-shrink-0 text-xs text-gray-600 font-medium">
                  {formatDistance(item.distance)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

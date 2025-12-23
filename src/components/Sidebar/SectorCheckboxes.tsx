import type { SchoolSector } from '../../types';

interface SectorCheckboxesProps {
  sectors: Set<SchoolSector>;
  onToggle: (sector: SchoolSector) => void;
}

export function SectorCheckboxes({ sectors, onToggle }: SectorCheckboxesProps) {
  const allSectors: SchoolSector[] = ['Government', 'Catholic', 'Independent'];

  const getSectorColor = (sector: SchoolSector) => {
    switch (sector) {
      case 'Government':
        return 'text-green-600';
      case 'Catholic':
        return 'text-purple-600';
      case 'Independent':
        return 'text-orange-600';
    }
  };

  return (
    <div className="flex flex-wrap gap-3 mt-2">
      {allSectors.map((sector) => (
        <label
          key={sector}
          className="inline-flex items-center gap-2 cursor-pointer group"
        >
          <input
            type="checkbox"
            checked={sectors.has(sector)}
            onChange={() => onToggle(sector)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-600 focus:ring-offset-0"
          />
          <span className={`text-sm font-medium group-hover:opacity-70 transition-opacity ${getSectorColor(sector)}`}>
            {sector}
          </span>
        </label>
      ))}
    </div>
  );
}

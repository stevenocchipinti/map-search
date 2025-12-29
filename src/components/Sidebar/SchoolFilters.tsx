import type { SchoolSector, SchoolType } from '../../types';
import { Switch } from '../UI/Switch';

interface SchoolFiltersProps {
  sectors: Set<SchoolSector>;
  onToggleSector: (sector: SchoolSector) => void;
  schoolTypes: Set<SchoolType>;
  onToggleSchoolType: (type: SchoolType) => void;
}

export function SchoolFilters({ 
  sectors, 
  onToggleSector,
  schoolTypes,
  onToggleSchoolType,
}: SchoolFiltersProps) {
  const allSectors: SchoolSector[] = ['Government', 'Catholic', 'Independent'];
  const allTypes: SchoolType[] = ['Primary', 'Secondary', 'Combined'];

  return (
    <div className="space-y-4">
      {/* Sector filters */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-3">Sector</p>
        <div className="space-y-2">
          {allSectors.map((sector) => (
            <label
              key={sector}
              htmlFor={`sector-${sector.toLowerCase()}`}
              className="flex items-center justify-between cursor-pointer py-1"
            >
              <span className="text-sm font-medium text-gray-700">
                {sector}
              </span>
              <Switch
                id={`sector-${sector.toLowerCase()}`}
                checked={sectors.has(sector)}
                onCheckedChange={() => onToggleSector(sector)}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Type filters */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-3">Level</p>
        <div className="space-y-2">
          {allTypes.map((type) => (
            <label
              key={type}
              htmlFor={`type-${type.toLowerCase()}`}
              className="flex items-center justify-between cursor-pointer py-1"
            >
              <span className="text-sm font-medium text-gray-700">
                {type}
              </span>
              <Switch
                id={`type-${type.toLowerCase()}`}
                checked={schoolTypes.has(type)}
                onCheckedChange={() => onToggleSchoolType(type)}
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

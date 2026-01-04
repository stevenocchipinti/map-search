import type { SchoolSector } from "../../types"

interface SectorCheckboxesProps {
  sectors: Set<SchoolSector>
  onToggle: (sector: SchoolSector) => void
}

export function SectorCheckboxes({ sectors, onToggle }: SectorCheckboxesProps) {
  const allSectors: SchoolSector[] = ["Government", "Catholic", "Independent"]

  const getSectorColor = (sector: SchoolSector) => {
    switch (sector) {
      case "Government":
        return "text-blue-700 accent-blue-600"
      case "Catholic":
        return "text-red-700 accent-red-600"
      case "Independent":
        return "text-purple-700 accent-purple-600"
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      {allSectors.map(sector => (
        <label
          key={sector}
          htmlFor={`sector-${sector.toLowerCase()}`}
          className="inline-flex items-center gap-2 cursor-pointer hover:opacity-75 transition-opacity"
        >
          <input
            type="checkbox"
            id={`sector-${sector.toLowerCase()}`}
            name={`sector-${sector.toLowerCase()}`}
            checked={sectors.has(sector)}
            onChange={() => onToggle(sector)}
            className="w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
          />
          <span className={`text-sm font-medium ${getSectorColor(sector)}`}>
            {sector}
          </span>
        </label>
      ))}
    </div>
  )
}

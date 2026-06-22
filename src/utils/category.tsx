import { GraduationCap, Train, ShoppingCart } from "lucide-react"
import type { POICategory } from "../types"

export function getCategoryIcon(category: POICategory) {
  switch (category) {
    case "school":
      return GraduationCap
    case "station":
      return Train
    case "supermarket":
      return ShoppingCart
  }
}

export function getCategoryLabel(category: POICategory): string {
  switch (category) {
    case "school":
      return "School"
    case "station":
      return "Station"
    case "supermarket":
      return "Grocer"
  }
}

export function getCategoryTextColor(category: POICategory): string {
  switch (category) {
    case "school":
      return "text-blue-500"
    case "station":
      return "text-violet-500"
    case "supermarket":
      return "text-teal-500 dark:text-teal-600"
  }
}

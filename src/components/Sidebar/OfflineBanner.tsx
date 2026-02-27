import { WifiOff, X } from "lucide-react"

interface OfflineBannerProps {
  onDismiss?: () => void
}

export function OfflineBanner({ onDismiss }: OfflineBannerProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mx-5 mt-3 dark:bg-amber-950 dark:border-amber-800">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center dark:bg-amber-900">
          <WifiOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">You're offline</p>
          <p className="mt-1 text-sm text-amber-800 leading-relaxed dark:text-amber-300">
            You can still use your location or search from recently viewed
            areas. Some features may be limited.
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-all duration-200 dark:text-amber-400 dark:hover:text-amber-200 dark:hover:bg-amber-900"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

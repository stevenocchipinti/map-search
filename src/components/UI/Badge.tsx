interface BadgeProps {
  children: React.ReactNode
  variant?: "default" | "estimate" | "actual" | "loading"
  icon?: React.ReactNode
}

export function Badge({ children, variant = "default", icon }: BadgeProps) {
  const variantStyles = {
    default: "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    estimate: "bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
    actual: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800",
    loading: "bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${variantStyles[variant]}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  )
}

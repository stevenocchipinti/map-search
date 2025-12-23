interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'estimate' | 'actual' | 'loading';
  icon?: React.ReactNode;
}

export function Badge({ children, variant = 'default', icon }: BadgeProps) {
  const variantStyles = {
    default: 'bg-gray-100 text-gray-700',
    estimate: 'bg-gray-100 text-gray-600',
    actual: 'bg-blue-50 text-blue-700',
    loading: 'bg-gray-50 text-gray-500',
  };
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${variantStyles[variant]}`}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

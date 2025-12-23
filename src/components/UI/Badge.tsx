interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'estimate' | 'actual' | 'loading';
  icon?: React.ReactNode;
}

export function Badge({ children, variant = 'default', icon }: BadgeProps) {
  const variantStyles = {
    default: 'bg-gray-100 text-gray-700 border border-gray-200',
    estimate: 'bg-gray-50 text-gray-600 border border-gray-200',
    actual: 'bg-blue-50 text-blue-700 border border-blue-200',
    loading: 'bg-gray-50 text-gray-500 border border-gray-200',
  };
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${variantStyles[variant]}`}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

import { forwardRef } from 'react';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  'aria-label'?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, disabled = false, id, name, 'aria-label': ariaLabel }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        id={id}
        name={name}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={`
          peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full
          border-2 border-transparent shadow-sm transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          ${checked ? 'bg-blue-600' : 'bg-gray-200'}
        `}
      >
        <span
          className={`
            pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0
            transition-transform
            ${checked ? 'translate-x-4' : 'translate-x-0'}
          `}
        />
      </button>
    );
  }
);

Switch.displayName = 'Switch';

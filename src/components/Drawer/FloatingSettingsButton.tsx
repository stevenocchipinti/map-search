import { Settings } from 'lucide-react';

interface FloatingSettingsButtonProps {
  onClick: () => void;
}

export function FloatingSettingsButton({ onClick }: FloatingSettingsButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed top-4 right-4 z-50 w-12 h-12 bg-white rounded-full shadow-soft-lg text-gray-700 hover:text-gray-900 hover:shadow-soft-xl transition-all duration-200 flex items-center justify-center md:hidden"
      aria-label="Settings"
    >
      <Settings className="w-6 h-6" />
    </button>
  );
}

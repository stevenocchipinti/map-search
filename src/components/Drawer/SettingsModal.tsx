import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Drawer } from '../../lib/vaul';
import { SettingsPanel } from '../Settings/SettingsPanel';
import type { SchoolSector } from '../../types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  sectors?: Set<SchoolSector>;
  onToggleSector?: (sector: SchoolSector) => void;
}

export function SettingsModal({ open, onClose, sectors, onToggleSector }: SettingsModalProps) {
  // Escape key handler
  useEffect(() => {
    if (!open) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);
  
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      direction="right"
      modal={true}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[1004] bg-black/40 md:hidden" />
        <Drawer.Content
          className="fixed top-0 right-0 bottom-0 z-[1005] flex flex-col bg-white w-[85vw] max-w-md shadow-2xl md:hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <SettingsPanel sectors={sectors} onToggleSector={onToggleSector} />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

'use client';

import { useState } from 'react';
import WidgetModal from './WidgetModal';

interface WidgetButtonProps {
  className: string;
  children: React.ReactNode;
}

export default function WidgetButton({ className, children }: WidgetButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className={className} onClick={() => setIsOpen(true)} aria-label="Ajouter un widget">
        {children}
      </button>
      
      {isOpen && <WidgetModal onClose={() => setIsOpen(false)} />}
    </>
  );
}

'use client';

import { useState } from 'react';
import SessionModal from './SessionModal';

interface SessionStartButtonProps {
  className?: string;
  children: React.ReactNode;
}

export default function SessionStartButton({ className, children }: SessionStartButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        className={className} 
        onClick={() => setIsOpen(true)} 
        aria-label="Démarrer la session"
        style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {children}
      </button>
      
      {isOpen && <SessionModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
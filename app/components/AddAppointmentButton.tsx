'use client';

import { useState } from 'react';
import NewAppointmentModal from './NewAppointmentModal';

interface AddAppointmentButtonProps {
  className: string;
  iconClassName: string;
}

export default function AddAppointmentButton({ className, iconClassName }: AddAppointmentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className={className} onClick={() => setIsOpen(true)} aria-label="Nouveau Rendez-vous">
        <span className={iconClassName}>+</span>
      </button>
      
      {isOpen && <NewAppointmentModal onClose={() => setIsOpen(false)} />}
    </>
  );
}

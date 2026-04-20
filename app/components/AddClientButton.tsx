'use client';

import { useState } from 'react';
import Image from 'next/image';
import NewClientModal from './NewClientModal';

interface AddClientButtonProps {
  className: string;
  buttonIconClassName: string;
}

export default function AddClientButton({ className, buttonIconClassName }: AddClientButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className={className} onClick={() => setIsOpen(true)} aria-label="Nouveau Client">
        <Image 
          src="/icones/clients.svg" 
          alt="Clients" 
          width={24} 
          height={24} 
          className={buttonIconClassName} 
        />
      </button>
      
      {isOpen && <NewClientModal onClose={() => setIsOpen(false)} />}
    </>
  );
}

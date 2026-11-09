import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface DialogProps {
  label: string;
  onClose: () => void;
  children: ReactNode;
  closeOnBackdrop?: boolean;
}

export function Dialog({ label, onClose, children, closeOnBackdrop = false }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="app-dialog"
    >
      <div
        className="flex min-h-full items-center justify-center p-4"
        onClick={(event) => {
          if (closeOnBackdrop && event.target === event.currentTarget) onClose();
        }}
      >
        {children}
      </div>
    </dialog>
  );
}

import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '../i18n.tsx';
import { Dialog } from './Dialog.tsx';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, onCancel, onConfirm }: ConfirmDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog label={title} onClose={onCancel} closeOnBackdrop>
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0f121d] p-6 text-left shadow-2xl sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-300">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" autoFocus onClick={onCancel} className="min-h-11 rounded-xl border border-slate-700 px-5 text-sm font-semibold text-slate-200 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5b974]">
            {t('Cancelar')}
          </button>
          <button type="button" onClick={onConfirm} className="min-h-11 rounded-xl bg-red-700 px-5 text-sm font-semibold text-white hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5b974]">
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

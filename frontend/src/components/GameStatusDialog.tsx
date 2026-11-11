import { useState } from 'react';
import { Check, Gamepad2, X } from 'lucide-react';
import type { Game, GameStatus, UserGame } from '../types.ts';
import { useLanguage } from '../i18n.tsx';
import { Dialog } from './Dialog.tsx';

type ProgressStatus = Exclude<GameStatus, 'WISHLIST'>;

const OPTIONS: { value: ProgressStatus; label: string }[] = [
  { value: 'PLAYING', label: 'Jugando' },
  { value: 'PLAYED', label: 'Jugado' },
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'ABANDONED', label: 'Abandonado' }
];

interface GameStatusDialogProps {
  game: Game;
  status?: GameStatus;
  token: string;
  onClose: () => void;
  onSaved: (userGame: UserGame & { game: Game }) => void;
  onRemoved: (gameId: number) => void;
}

export function GameStatusDialog({ game, status, token, onClose, onSaved, onRemoved }: GameStatusDialogProps) {
  const { t } = useLanguage();
  const initialStatus = status && status !== 'WISHLIST' ? status : null;
  const [selected, setSelected] = useState<ProgressStatus | null>(
    initialStatus
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const removing = initialStatus !== null && selected === null;

  const save = async () => {
    if (saving || selected === initialStatus) return;
    setSaving(true);
    setError(false);
    try {
      if (removing) {
        const response = await fetch(`/api/library/${game.igdbId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`Game removal failed: ${response.status}`);
        const result: { success: boolean } = await response.json();
        if (!result.success) throw new Error('Game was not removed from the library');
        onRemoved(game.igdbId);
        onClose();
        return;
      }
      if (!selected) return;
      if (!status) {
        const imported = await fetch(`/api/games/import/${game.igdbId}`, { method: 'POST' });
        if (!imported.ok) throw new Error(`Game import failed: ${imported.status}`);
      }

      const response = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gameId: game.igdbId, status: selected })
      });
      if (!response.ok) throw new Error(`Status update failed: ${response.status}`);
      const saved: UserGame & { game: Game } = await response.json();
      onSaved(saved);
      onClose();
    } catch (err) {
      console.error('Error saving game status:', err);
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog label={t('Gestionar estado del juego')} onClose={() => { if (!saving) onClose(); }} closeOnBackdrop>
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0f121d] p-5 text-slate-200 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Gamepad2 className="size-5 shrink-0 text-[#e5b974]" aria-hidden="true" />
              {t('Gestionar estado del juego')}
            </h2>
            <p className="mt-1 break-words text-sm text-slate-400">{game.name}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label={t('Cerrar')} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5b974] disabled:opacity-50">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <fieldset className="mt-6 space-y-2" disabled={saving}>
          <legend className="mb-2 text-sm font-semibold text-slate-300">{t('Selecciona un estado')}</legend>
          {OPTIONS.map(option => (
            <button type="button" key={option.value} aria-pressed={selected === option.value} onClick={() => setSelected(current => current === option.value ? null : option.value)} className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5b974] ${selected === option.value ? 'border-[#d9a352]/60 bg-[#d9a352]/10 text-white' : 'border-slate-800 text-slate-300 hover:border-slate-600'}`}>
              <span>{t(option.label)}</span>
              <span className="grid size-5 place-items-center rounded-full border border-slate-500">
                {selected === option.value && <Check className="size-3.5 text-[#e5b974]" aria-hidden="true" />}
              </span>
            </button>
          ))}
        </fieldset>
        {removing && <p className="mt-4 text-sm text-amber-200">{t('Al guardar, se eliminará el juego de tu biblioteca y wishlist, junto con sus horas, valoración, notas y fechas.')}</p>}
        {error && <p role="alert" className="mt-4 text-sm text-red-300">{t(removing ? 'No se pudo eliminar el juego. Inténtalo de nuevo.' : 'No se pudo guardar el estado. Inténtalo de nuevo.')}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-xl px-3 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50">{t('Cancelar')}</button>
          <button type="button" onClick={() => void save()} disabled={saving || selected === initialStatus} className="min-h-10 rounded-xl bg-[#d9a352] px-4 text-sm font-bold text-[#17120a] hover:bg-[#e5b974] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5b974] disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? t('Guardando...') : removing ? t('Eliminar de la biblioteca') : t('Guardar')}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

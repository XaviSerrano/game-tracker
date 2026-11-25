import { apiFetch } from '../api.ts';
import { useState, type FormEvent } from 'react';
import { Check, Gamepad2, Star, X } from 'lucide-react';
import type { Game, GameStatus, UserGame } from '../types.ts';
import { useLanguage } from '../i18n.tsx';
import { Dialog } from './Dialog.tsx';
import { GameStatusIcon } from './GameStatusIcon.tsx';
import { useActionNotice } from './ActionNotice.tsx';

type ProgressStatus = Exclude<GameStatus, 'WISHLIST'>;
type DialogStep = 'status' | 'details' | 'review';

const OPTIONS: { value: ProgressStatus; label: string }[] = [
  { value: 'PLAYING', label: 'Jugando' },
  { value: 'PLAYED', label: 'Jugado' },
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'ABANDONED', label: 'Abandonado' }
];

interface GameStatusDialogProps {
  game: Game;
  status?: GameStatus;
  initialHours?: number;
  initialRating?: number;
  token: string;
  onClose: () => void;
  onSaved: (userGame: UserGame) => void;
  onRemoved: (gameId: number) => void;
}

export function GameStatusDialog({ game, status, initialHours = 0, initialRating = 0, token, onClose, onSaved, onRemoved }: GameStatusDialogProps) {
  const { t } = useLanguage();
  const notice = useActionNotice();
  const initialStatus = status && status !== 'WISHLIST' ? status : null;
  const [step, setStep] = useState<DialogStep>('status');
  const [selected, setSelected] = useState<ProgressStatus | null>(initialStatus);
  const [hoursPlayed, setHoursPlayed] = useState(initialHours);
  const [rating, setRating] = useState(initialRating);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const removing = initialStatus !== null && selected === null;

  const save = async () => {
    if (saving || selected === initialStatus) return;
    setSaving(true);
    setError('');
    try {
      if (removing) {
        const response = await apiFetch(`/api/library/${game.igdbId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`Game removal failed: ${response.status}`);
        const result: { success: boolean } = await response.json();
        if (!result.success) throw new Error('Game was not removed from the library');
        onRemoved(game.igdbId);
        notice.success(t('Juego eliminado de tu biblioteca.'));
        onClose();
        return;
      }
      if (!selected) return;
      if (!status) {
        const imported = await apiFetch(`/api/games/import/${game.igdbId}`, { method: 'POST' });
        if (!imported.ok) throw new Error(`Game import failed: ${imported.status}`);
      }

      const response = await apiFetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gameId: game.igdbId, status: selected })
      });
      if (!response.ok) throw new Error(`Status update failed: ${response.status}`);
      const saved: UserGame = await response.json();
      onSaved(saved);
      notice.success(t('Estado del juego actualizado.'));
      setStep('details');
    } catch (err) {
      console.error('Error saving game status:', err);
      setError(t(removing ? 'No se pudo eliminar el juego. Inténtalo de nuevo.' : 'No se pudo guardar el estado. Inténtalo de nuevo.'));
    } finally {
      setSaving(false);
    }
  };

  const saveDetails = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const response = await apiFetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gameId: game.igdbId, status: selected, hoursPlayed, rating })
      });
      if (!response.ok) throw new Error(`Game details update failed: ${response.status}`);
      const saved: UserGame = await response.json();
      onSaved(saved);
      return true;
    } catch (err) {
      console.error('Error saving game details:', err);
      setError(t('No se pudieron guardar las horas y la valoración. Inténtalo de nuevo.'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const closeAfterDetails = async () => {
    if (await saveDetails()) onClose();
  };

  const openReview = async () => {
    if (await saveDetails()) setStep('review');
  };

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await apiFetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gameId: game.igdbId, title: reviewTitle.trim(), content: reviewContent.trim(), rating })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not publish review.');
      notice.success(t('Reseña publicada.'));
      onClose();
    } catch (err) {
      console.error('Error publishing review:', err);
      setError(t('No se pudo publicar la reseña.'));
    } finally {
      setSaving(false);
    }
  };

  const stepLabel = step === 'status'
    ? t('Gestionar estado del juego')
    : step === 'details' ? t('Horas y valoración') : t('Escribir review');

  if (step === 'review') {
    return (
      <Dialog label={stepLabel} onClose={() => { if (!saving) onClose(); }} closeOnBackdrop>
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0f121d] p-5 text-slate-200 shadow-xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Gamepad2 className="size-5 shrink-0 text-accent" aria-hidden="true" />{stepLabel}</h2>
              <p className="mt-1 break-words text-sm text-slate-400">{game.name}</p>
            </div>
            <button type="button" onClick={() => { if (!saving) void (step === 'details' ? closeAfterDetails() : Promise.resolve(onClose())); }} disabled={saving} aria-label={t('Cerrar')} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"><X className="size-5" aria-hidden="true" /></button>
          </div>
          <form onSubmit={event => void submitReview(event)} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-slate-300" htmlFor="status-dialog-review-title">{t('Título de la reseña')}
              <input id="status-dialog-review-title" required maxLength={120} value={reviewTitle} onChange={event => setReviewTitle(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-800 bg-[#07090e] px-3 text-sm font-normal text-white outline-none focus:border-accent" />
            </label>
            <label className="block text-sm font-semibold text-slate-300" htmlFor="status-dialog-review-content">{t('Tu reseña')}
              <textarea id="status-dialog-review-content" required rows={5} maxLength={5000} value={reviewContent} onChange={event => setReviewContent(event.target.value)} className="mt-2 w-full resize-y rounded-xl border border-slate-800 bg-[#07090e] px-3 py-2.5 text-sm font-normal leading-6 text-white outline-none focus:border-accent" />
            </label>
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setStep('details')} disabled={saving} className="min-h-10 rounded-xl px-4 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50">{t('Volver')}</button>
              <button type="submit" disabled={saving || !reviewTitle.trim() || !reviewContent.trim()} className="min-h-10 rounded-xl bg-accent px-4 text-sm font-bold text-on-accent hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50">{saving ? t('Publicando...') : t('Publicar reseña')}</button>
            </div>
          </form>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog label={stepLabel} onClose={() => { if (!saving) onClose(); }} closeOnBackdrop>
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0f121d] p-5 text-slate-200 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Gamepad2 className="size-5 shrink-0 text-accent" aria-hidden="true" />
              {stepLabel}
            </h2>
            <p className="mt-1 break-words text-sm text-slate-400">{game.name}</p>
          </div>
          <button type="button" onClick={() => { if (!saving) void (step === 'details' ? closeAfterDetails() : Promise.resolve(onClose())); }} disabled={saving} aria-label={t('Cerrar')} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {step === 'status' ? (
          <>
            <fieldset className="mt-6 space-y-2" disabled={saving}>
              <legend className="mb-2 text-sm font-semibold text-slate-300">{t('Selecciona un estado')}</legend>
              {OPTIONS.map(option => (
                <button type="button" key={option.value} aria-pressed={selected === option.value} onClick={() => setSelected(current => current === option.value ? null : option.value)} className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${selected === option.value ? 'border-accent/60 bg-accent/10 text-white' : 'border-slate-800 text-slate-300 hover:border-slate-600'}`}>
                  <span className="flex items-center gap-2"><GameStatusIcon status={option.value} className="size-4 text-slate-400" />{t(option.label)}</span>
                  <span className="grid size-5 place-items-center rounded-full border border-slate-500">{selected === option.value && <Check className="size-3.5 text-accent" aria-hidden="true" />}</span>
                </button>
              ))}
            </fieldset>
            {removing && <p className="mt-4 text-sm text-amber-200">{t('Al guardar, se eliminará el juego de tu biblioteca y wishlist, junto con sus horas, valoración y fechas.')}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-xl px-3 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50">{t('Cancelar')}</button>
              <button type="button" onClick={() => void save()} disabled={saving || selected === initialStatus} className="min-h-10 rounded-xl bg-accent px-4 text-sm font-bold text-on-accent hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50">{saving ? t('Guardando...') : removing ? t('Eliminar de la biblioteca') : t('Guardar')}</button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-6 space-y-5">
              <label className="block text-sm font-semibold text-slate-300" htmlFor="status-dialog-hours">{t('Horas jugadas')}
                <input id="status-dialog-hours" type="number" min="0" max="1000000" step="0.5" value={hoursPlayed} onChange={event => setHoursPlayed(Math.max(0, Number(event.target.value) || 0))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-800 bg-[#07090e] px-3 text-sm font-normal text-white outline-none focus:border-accent" />
              </label>
              <fieldset>
                <legend className="text-sm font-semibold text-slate-300">{t('Valoración')}</legend>
                <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-800 bg-[#07090e] px-3 py-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} type="button" onClick={() => setRating(current => current === star ? 0 : star)} aria-label={`${star} ${t('estrellas')}`} aria-pressed={rating >= star} className="grid size-9 place-items-center rounded-lg hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-accent">
                        <Star className={`size-5 ${rating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                  <span className="text-sm text-slate-400">{rating ? `${rating}/5` : t('Sin valoración')}</span>
                </div>
              </fieldset>
            </div>
            {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => void openReview()} disabled={saving} className="min-h-10 px-4 text-sm font-bold text-accent underline decoration-2 underline-offset-4 hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50">{saving ? t('Guardando...') : t('Escribir review')}</button>
              <button type="button" onClick={() => void closeAfterDetails()} disabled={saving} className="min-h-10 rounded-xl bg-accent px-4 text-sm font-bold text-on-accent hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50">{saving ? t('Guardando...') : t('Guardar')}</button>
            </div>
          </>
        )}
        {error && step === 'status' && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
      </div>
    </Dialog>
  );
}

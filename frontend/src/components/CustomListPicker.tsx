import { useEffect, useState } from 'react';
import { ListPlus, X } from 'lucide-react';
import { apiFetch } from '../api.ts';
import type { CustomList, Game } from '../types.ts';
import { useLanguage } from '../i18n.tsx';
import { Dialog } from './Dialog.tsx';

interface CustomListPickerProps {
  game: Game | null;
  userId: string;
  token: string;
  onClose: () => void;
}

export function CustomListPicker({ game, userId, token, onClose }: CustomListPickerProps) {
  const { t } = useLanguage();
  const [lists, setLists] = useState<CustomList[]>([]);
  const [membership, setMembership] = useState<Record<string, boolean>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!game) return;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await apiFetch(`/api/lists?userId=${userId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error('Could not load lists');
        const data: (CustomList & { games: Game[] })[] = await response.json();
        if (!cancelled) {
          setLists(data);
          setMembership(Object.fromEntries(data.map(list => [list.id, list.games.some(entry => entry.igdbId === game.igdbId)])));
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [game, userId, token]);

  const toggleList = async (list: CustomList) => {
    if (!game || updatingId) return;
    setUpdatingId(list.id);
    setError(false);
    try {
      const response = await apiFetch(`/api/lists/${list.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Could not load list');
      const data = await response.json();
      const contains = data.games.some((entry: Game) => entry.igdbId === game.igdbId);
      const gameIds = contains
        ? data.games.filter((entry: Game) => entry.igdbId !== game.igdbId).map((entry: Game) => entry.igdbId)
        : [...data.games.map((entry: Game) => entry.igdbId), game.igdbId];
      const update = await apiFetch(`/api/lists/${list.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: data.name, description: data.description, isPublic: data.isPublic, gameIds })
      });
      if (!update.ok) throw new Error('Could not update list');
      setMembership(previous => ({ ...previous, [list.id]: !contains }));
    } catch {
      setError(true);
    } finally {
      setUpdatingId(null);
    }
  };

  if (!game) return null;
  return (
    <Dialog label={t('Añadir a lista personalizada')} onClose={onClose} closeOnBackdrop>
      <section className="w-full max-w-sm space-y-3 rounded-2xl border border-slate-850 bg-[#0f121d] p-5 shadow-2xl" aria-labelledby="custom-list-picker-title">
        <header className="flex items-center justify-between">
          <h2 id="custom-list-picker-title" className="flex items-center gap-2 text-sm font-bold text-slate-200"><ListPlus className="size-4 text-accent" aria-hidden="true" />{t('Añadir a lista personalizada')}</h2>
          <button type="button" onClick={onClose} aria-label={t('Cerrar')} className="rounded p-1 text-slate-400 hover:text-white focus-visible:outline-2 focus-visible:outline-accent"><X className="size-4" aria-hidden="true" /></button>
        </header>
        <p className="text-xs text-slate-300">{game.name}</p>
        {error && <p role="alert" className="text-xs text-red-300">{t('No se pudieron cargar o actualizar tus listas.')}</p>}
        {lists.length === 0 && !error ? <p className="py-4 text-center text-xs text-slate-400">{t('Todavía no tienes listas personalizadas creadas.')}</p> : (
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {lists.map(list => {
              const added = membership[list.id] === true;
              const updating = updatingId === list.id;
              return <button key={list.id} type="button" onClick={() => void toggleList(list)} disabled={updatingId !== null} aria-pressed={added} className={`flex min-h-11 w-full items-center justify-between rounded-xl border p-2.5 text-left text-xs transition focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60 ${added ? 'border-accent/30 bg-accent/10 text-accent' : 'border-slate-800 bg-[#07090e] text-slate-200 hover:border-accent/30 hover:text-accent'}`}>
                <span>{list.name}</span><span>{updating ? t('Actualizando...') : added ? `✓ ${t('Añadido')}` : `${t('Añadir')} +`}</span>
              </button>;
            })}
          </div>
        )}
      </section>
    </Dialog>
  );
}

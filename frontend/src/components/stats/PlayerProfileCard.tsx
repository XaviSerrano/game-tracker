import React from 'react';
import { Sparkles, Gamepad2, Star, Hourglass, Percent, LucideIcon } from 'lucide-react';
import { useLanguage } from '../../i18n.tsx';

interface ProfileRow {
  icon: LucideIcon;
  label: string;
  value: string;
}

interface PlayerProfileCardProps {
  favoriteGenre: string;
  favoritePlatform: string;
  averageRating: number;
  ratedGamesCount: number;
  averageHoursPerGame: number;
  completionRate: number;
}

export const PlayerProfileCard: React.FC<PlayerProfileCardProps> = ({
  favoriteGenre,
  favoritePlatform,
  averageRating,
  ratedGamesCount,
  averageHoursPerGame,
  completionRate
}) => {
  const { t } = useLanguage();
  const rows: ProfileRow[] = [
    { icon: Sparkles, label: t('Género más jugado'), value: favoriteGenre || t('Sin datos todavía') },
    { icon: Gamepad2, label: t('Plataforma principal'), value: favoritePlatform || t('Sin datos todavía') },
    {
      icon: Star,
      label: t('Rating medio'),
      value: ratedGamesCount > 0 ? `${averageRating.toFixed(1)} / 5` : t('Sin valoraciones')
    },
    {
      icon: Hourglass,
      label: t('Duración media por juego'),
      value: averageHoursPerGame > 0 ? `${averageHoursPerGame}h` : t('Sin horas registradas')
    },
    { icon: Percent, label: t('Ratio de finalización'), value: `${completionRate}%` }
  ];

  return (
    <div className="bg-[#0f121d] border border-slate-850 p-5 rounded-2xl">
      <h3 className="font-semibold text-slate-300 font-display text-sm mb-4">{t('Perfil de jugador')}</h3>

      <div className="space-y-3">
        {rows.map(row => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 py-2 border-b border-slate-850 last:border-0 last:pb-0"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 bg-blue-600/10 text-blue-400 rounded-lg border border-blue-500/15 flex-shrink-0">
                <row.icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs text-slate-400 truncate">{row.label}</span>
            </div>
            <span className="text-xs font-bold text-white font-display flex-shrink-0 truncate max-w-[45%] text-right">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

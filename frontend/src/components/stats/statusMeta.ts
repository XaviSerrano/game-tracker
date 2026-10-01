import { Gamepad2, CheckCircle2, Trophy, XCircle, Bookmark, LucideIcon } from 'lucide-react';
import { GameStatus } from '../../types.ts';

export interface StatusMeta {
  label: string;
  icon: LucideIcon;
  text: string;
  bg: string;
  border: string;
}

export const STATUS_META: Record<GameStatus, StatusMeta> = {
  WISHLIST: {
    label: 'Wishlist',
    icon: Bookmark,
    text: 'text-indigo-300',
    bg: 'bg-indigo-600/15',
    border: 'border-indigo-500/20'
  },
  PLAYING: {
    label: 'Jugando',
    icon: Gamepad2,
    text: 'text-blue-300',
    bg: 'bg-blue-600/15',
    border: 'border-blue-500/20'
  },
  PLAYED: {
    label: 'Jugados',
    icon: CheckCircle2,
    text: 'text-cyan-300',
    bg: 'bg-cyan-600/15',
    border: 'border-cyan-500/20'
  },
  COMPLETED: {
    label: 'Completados',
    icon: Trophy,
    text: 'text-emerald-300',
    bg: 'bg-emerald-600/15',
    border: 'border-emerald-500/20'
  },
  ABANDONED: {
    label: 'Abandonados',
    icon: XCircle,
    text: 'text-rose-300',
    bg: 'bg-rose-600/15',
    border: 'border-rose-500/20'
  }
};

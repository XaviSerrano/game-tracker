import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLanguage } from '../i18n.tsx';

interface DatePickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const parseIsoDate = (isoDate: string): Date | null => {
  if (!isoDate) return null;
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date: Date, language: 'en' | 'es'): string => {
  return date.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const parseManualDate = (raw: string, language: 'en' | 'es'): Date | null => {
  const value = raw.trim();
  if (!value) return null;

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return date;
    }
    return null;
  }

  const localizedMatch = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (localizedMatch) {
    const first = Number(localizedMatch[1]);
    const second = Number(localizedMatch[2]);
    const month = language === 'en' ? first : second;
    const day = language === 'en' ? second : first;
    const year = Number(localizedMatch[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return date;
    }
  }

  return null;
};

const sameDay = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

export const DatePicker: React.FC<DatePickerProps> = ({ id, value, onChange, placeholder, disabled = false }) => {
  const { t, language } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  const selectedDate = parseIsoDate(value);
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => selectedDate || new Date());
  const [inputValue, setInputValue] = useState<string>(() => selectedDate ? formatDisplayDate(selectedDate, language) : '');
  const [invalidInput, setInvalidInput] = useState(false);

  useEffect(() => {
    if (disabled && open) {
      setOpen(false);
    }
  }, [disabled, open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
      setInputValue(formatDisplayDate(selectedDate, language));
    } else {
      setInputValue('');
    }
  }, [value, language]);

  const monthLabel = useMemo(
    () => viewDate.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', { month: 'long', year: 'numeric' }),
    [viewDate, language]
  );
  const weekdays = language === 'en' ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const days = useMemo(() => {
    const cells: Array<Date | null> = [];
    for (let i = 0; i < firstWeekDay; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(new Date(year, month, day));
    }
    return cells;
  }, [firstWeekDay, month, totalDays, year]);

  const commitManualInput = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setInvalidInput(false);
      onChange('');
      setInputValue('');
      return;
    }

    const parsed = parseManualDate(trimmed, language);
    if (!parsed) {
      setInvalidInput(true);
      setInputValue(selectedDate ? formatDisplayDate(selectedDate, language) : '');
      return;
    }

    setInvalidInput(false);
    onChange(toIsoDate(parsed));
    setViewDate(parsed);
    setInputValue(formatDisplayDate(parsed, language));
  };

  return (
    <div className="relative" ref={containerRef} onKeyDown={(event) => {
      if (event.key === 'Escape' && open) {
        event.stopPropagation();
        setOpen(false);
        calendarButtonRef.current?.focus();
      }
    }}>
      <div className="w-full bg-[#07090e] border border-slate-800 rounded-xl p-2 text-xs text-white outline-none focus-within:border-blue-500 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
        <input
          id={id}
          type="text"
          disabled={disabled}
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setInvalidInput(false); }}
          aria-invalid={invalidInput}
          aria-describedby={invalidInput ? `${id}-error` : undefined}
          onBlur={() => { if (!invalidInput) commitManualInput(); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitManualInput();
            }
          }}
          placeholder={placeholder ?? t('Seleccionar fecha')}
          className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 outline-none disabled:cursor-not-allowed"
        />
        <button
          ref={calendarButtonRef}
          type="button"
          disabled={disabled}
          onClick={() => setOpen(prev => !prev)}
          className="p-1 rounded-md hover:bg-slate-800 transition text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={t('Abrir calendario')}
          aria-expanded={open}
          aria-controls={open ? `${id}-calendar` : undefined}
        >
          <Calendar className="w-3.5 h-3.5" />
        </button>
      </div>

      {invalidInput && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-300">{t('Fecha no válida.')} {language === 'en' ? 'MM/DD/YYYY' : 'DD/MM/AAAA'}</p>}

      {open && !disabled && (
        <div id={`${id}-calendar`} className="absolute z-30 mt-2 w-72 max-w-full bg-[#07090e] border border-slate-800 rounded-xl p-3 shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="p-1 rounded-md hover:bg-slate-800 transition text-slate-400"
              aria-label={t('Mes anterior')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="text-xs font-semibold text-slate-200 capitalize">{monthLabel}</p>
            <button
              type="button"
              onClick={() => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="p-1 rounded-md hover:bg-slate-800 transition text-slate-400"
              aria-label={t('Mes siguiente')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekdays.map((day, index) => (
              <span key={`${day}-${index}`} className="text-[10px] text-slate-500 text-center font-semibold py-1">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((dateCell, index) => {
              if (!dateCell) {
                return <span key={`empty-${index}`} className="h-8" />;
              }
              const isToday = sameDay(dateCell, today);
              const isSelected = selectedDate ? sameDay(dateCell, selectedDate) : false;

              return (
                <button
                  key={toIsoDate(dateCell)}
                  type="button"
                  aria-label={dateCell.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', { dateStyle: 'full' })}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setInvalidInput(false);
                    onChange(toIsoDate(dateCell));
                    setInputValue(formatDisplayDate(dateCell, language));
                    setOpen(false);
                  }}
                  className={`h-8 rounded-lg text-xs font-medium transition ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : isToday
                        ? 'bg-slate-800 text-slate-100'
                        : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {dateCell.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onChange(toIsoDate(today));
                setViewDate(today);
                setInputValue(formatDisplayDate(today, language));
                setOpen(false);
              }}
              className="text-[11px] text-blue-400 hover:text-blue-300 transition font-semibold"
            >
              {t('Hoy')}
            </button>

            {selectedDate ? (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setInputValue('');
                  setOpen(false);
                }}
                className="text-[11px] text-slate-400 hover:text-white transition font-semibold flex items-center gap-1"
              >
                <X className="w-3 h-3" /> {t('Limpiar')}
              </button>
            ) : <span />}
          </div>
        </div>
      )}
    </div>
  );
};

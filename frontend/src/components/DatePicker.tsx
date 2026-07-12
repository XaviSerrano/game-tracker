import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const WEEKDAYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

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

const formatDisplayDate = (date: Date): string => {
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const parseManualDate = (raw: string): Date | null => {
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

  const esMatch = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (esMatch) {
    const day = Number(esMatch[1]);
    const month = Number(esMatch[2]);
    const year = Number(esMatch[3]);
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

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, placeholder = 'Seleccionar fecha', disabled = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedDate = parseIsoDate(value);
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => selectedDate || new Date());
  const [inputValue, setInputValue] = useState<string>(() => selectedDate ? formatDisplayDate(selectedDate) : '');

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
      setInputValue(formatDisplayDate(selectedDate));
    } else {
      setInputValue('');
    }
  }, [value]);

  const monthLabel = useMemo(
    () => viewDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
    [viewDate]
  );

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
      onChange('');
      setInputValue('');
      return;
    }

    const parsed = parseManualDate(trimmed);
    if (!parsed) {
      setInputValue(selectedDate ? formatDisplayDate(selectedDate) : '');
      return;
    }

    onChange(toIsoDate(parsed));
    setViewDate(parsed);
    setInputValue(formatDisplayDate(parsed));
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="w-full bg-[#07090e] border border-slate-800 rounded-xl p-2 text-xs text-white outline-none focus-within:border-blue-500 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
        <input
          type="text"
          disabled={disabled}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={commitManualInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitManualInput();
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 outline-none disabled:cursor-not-allowed"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(prev => !prev)}
          className="p-1 rounded-md hover:bg-slate-800 transition text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Abrir calendario"
        >
          <Calendar className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && !disabled && (
        <div className="absolute z-30 mt-2 w-72 bg-[#07090e] border border-slate-800 rounded-xl p-3 shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="p-1 rounded-md hover:bg-slate-800 transition text-slate-400"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="text-xs font-semibold text-slate-200 capitalize">{monthLabel}</p>
            <button
              type="button"
              onClick={() => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="p-1 rounded-md hover:bg-slate-800 transition text-slate-400"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map(day => (
              <span key={day} className="text-[10px] text-slate-500 text-center font-semibold py-1">
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
                  onClick={() => {
                    onChange(toIsoDate(dateCell));
                    setInputValue(formatDisplayDate(dateCell));
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
                setInputValue(formatDisplayDate(today));
                setOpen(false);
              }}
              className="text-[11px] text-blue-400 hover:text-blue-300 transition font-semibold"
            >
              Hoy
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
                <X className="w-3 h-3" /> Limpiar
              </button>
            ) : <span />}
          </div>
        </div>
      )}
    </div>
  );
};

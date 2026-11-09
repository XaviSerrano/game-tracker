import { useLanguage } from '../../i18n.tsx';

interface ChartDataTableProps {
  label: string;
  categoryLabel: string;
  valueLabel: string;
  rows: { label: string; value: string | number }[];
}

export function ChartDataTable({ label, categoryLabel, valueLabel, rows }: ChartDataTableProps) {
  const { t } = useLanguage();

  return (
    <details className="mt-3 text-sm text-slate-300">
      <summary className="cursor-pointer font-semibold text-blue-400">{t('Ver datos')}</summary>
      <table className="mt-3 w-full text-left">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr className="border-b border-slate-800">
            <th scope="col" className="py-2 pr-3">{categoryLabel}</th>
            <th scope="col" className="py-2 text-right">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.label}-${index}`} className="border-b border-slate-800/50">
              <th scope="row" className="py-2 pr-3 font-normal">{row.label}</th>
              <td className="py-2 text-right tabular-nums">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

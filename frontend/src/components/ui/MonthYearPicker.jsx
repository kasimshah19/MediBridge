import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

const MONTHS = [
  { value: '01', label: '01 - Jan' },
  { value: '02', label: '02 - Feb' },
  { value: '03', label: '03 - Mar' },
  { value: '04', label: '04 - Apr' },
  { value: '05', label: '05 - May' },
  { value: '06', label: '06 - Jun' },
  { value: '07', label: '07 - Jul' },
  { value: '08', label: '08 - Aug' },
  { value: '09', label: '09 - Sep' },
  { value: '10', label: '10 - Oct' },
  { value: '11', label: '11 - Nov' },
  { value: '12', label: '12 - Dec' },
];

export default function MonthYearPicker({
  value,
  onChange,
  disabled = false,
  error = null,
  label = 'Expiry Date (MM/YYYY)',
  required = false,
}) {
  const currentYear = new Date().getFullYear();
  // Allow years from currentYear to currentYear + 10
  const years = Array.from({ length: 11 }, (_, i) => currentYear + i);

  // Parse existing value
  let initialMonth = '';
  let initialYear = '';

  if (value) {
    if (typeof value === 'string' && /^\d{4}-\d{2}/.test(value)) {
      const [y, m] = value.split('-');
      initialYear = y;
      initialMonth = m.slice(0, 2);
    } else if (typeof value === 'string' && /^\d{1,2}\/\d{4}$/.test(value)) {
      const [m, y] = value.split('/');
      initialYear = y;
      initialMonth = m.padStart(2, '0');
    } else {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        initialYear = String(d.getFullYear());
        initialMonth = String(d.getMonth() + 1).padStart(2, '0');
      }
    }
  }

  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);

  useEffect(() => {
    if (value) {
      if (typeof value === 'string' && /^\d{4}-\d{2}/.test(value)) {
        const [y, m] = value.split('-');
        setYear(y);
        setMonth(m.slice(0, 2));
      } else if (typeof value === 'string' && /^\d{1,2}\/\d{4}$/.test(value)) {
        const [m, y] = value.split('/');
        setYear(y);
        setMonth(m.padStart(2, '0'));
      }
    }
  }, [value]);

  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setMonth(newMonth);
    if (newMonth && year) {
      onChange(`${year}-${newMonth}`);
    } else if (!newMonth && !year) {
      onChange('');
    }
  };

  const handleYearChange = (e) => {
    const newYear = e.target.value;
    setYear(newYear);
    if (month && newYear) {
      onChange(`${newYear}-${month}`);
    } else if (!month && !newYear) {
      onChange('');
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-text-heading mb-1.5 flex items-center gap-1.5">
          <Calendar size={13} className="text-teal-700" />
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="grid grid-cols-2 gap-2">
        {/* Month Selector */}
        <select
          value={month}
          onChange={handleMonthChange}
          disabled={disabled}
          className={`w-full px-3 py-2 text-xs rounded-xl bg-white border transition-all duration-200 outline-none focus:ring-2 focus:ring-teal-500/20 ${
            error
              ? 'border-rose-400 focus:border-rose-500'
              : 'border-slate-200 focus:border-teal-600'
          } ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-75' : ''}`}
        >
          <option value="">Month</option>
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Year Selector */}
        <select
          value={year}
          onChange={handleYearChange}
          disabled={disabled}
          className={`w-full px-3 py-2 text-xs rounded-xl bg-white border transition-all duration-200 outline-none focus:ring-2 focus:ring-teal-500/20 ${
            error
              ? 'border-rose-400 focus:border-rose-500'
              : 'border-slate-200 focus:border-teal-600'
          } ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-75' : ''}`}
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-1 text-[11px] text-rose-600 font-medium">{error}</p>}
    </div>
  );
}


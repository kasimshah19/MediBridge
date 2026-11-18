import React from 'react';

/**
 * Format input to XXXXX-XXXXX automatically as the user types.
 */
export const ManualCodeInput = ({
  value = '',
  onChange,
  onEnter,
  placeholder = 'ABCDE-FGHIJ',
  disabled = false,
  className = '',
}) => {
  const handleChange = (e) => {
    const raw = e.target.value.toUpperCase().replace(/[^23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/g, '');
    let formatted = raw.slice(0, 10);
    if (formatted.length > 5) {
      formatted = `${formatted.slice(0, 5)}-${formatted.slice(5, 10)}`;
    }
    onChange(formatted);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={11}
        className="w-full text-center tracking-widest font-mono text-xl sm:text-2xl font-bold px-4 py-3 bg-white border-2 border-slate-300 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100 text-slate-800 placeholder-slate-400 shadow-sm transition-colors"
      />
    </div>
  );
};

export default ManualCodeInput;

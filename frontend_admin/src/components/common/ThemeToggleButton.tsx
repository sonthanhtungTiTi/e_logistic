import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleButtonProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  className = '',
  showLabel = false,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
      aria-label={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
      className={`px-3 py-1.5 rounded-xl border transition-all duration-200 ease-out flex items-center justify-center gap-2 cursor-pointer text-xs font-semibold select-none active:scale-95 shadow-sm ${
        isDark
          ? 'bg-slate-800/90 hover:bg-slate-700 text-amber-400 border-slate-700 hover:border-amber-400/40'
          : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 hover:border-amber-400 shadow-amber-500/10'
      } ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-90" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-300 hover:-rotate-45" />
        )}
      </div>
      {showLabel ? (
        <span className="font-medium">
          {isDark ? 'Giao diện Sáng' : 'Giao diện Tối'}
        </span>
      ) : (
        <span className="sr-only">{isDark ? 'Chế độ Sáng' : 'Chế độ Tối'}</span>
      )}
    </button>
  );
};


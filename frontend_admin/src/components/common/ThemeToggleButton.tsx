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

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
      className={`px-3 py-2 rounded-xl border transition-all duration-200 ease-out flex items-center justify-center gap-1.5 cursor-pointer text-xs font-semibold select-none active:scale-95 ${
        theme === 'dark'
          ? 'bg-slate-800/90 hover:bg-slate-700 text-amber-400 border-slate-700 shadow-md'
          : 'bg-amber-100/90 hover:bg-amber-200 text-amber-800 border-amber-300 shadow-sm'
      } ${className}`}
    >
      <div className="transition-transform duration-300 transform hover:rotate-45">
        {theme === 'dark' ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-600" />
        )}
      </div>
      {showLabel && (
        <span>{theme === 'dark' ? 'Chế độ Sáng' : 'Chế độ Tối'}</span>
      )}
    </button>
  );
};

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleButtonProps {
  className?: string;
}

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
      className={`px-3 py-2 rounded-xl border transition-all duration-200 ease-out flex items-center justify-center gap-1.5 cursor-pointer text-xs font-semibold select-none active:scale-95 ${
        theme === 'dark'
          ? 'bg-slate-800/90 hover:bg-slate-700 text-blue-400 border-slate-700 shadow-md'
          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
      } ${className}`}
    >
      <div className="transition-transform duration-300 transform hover:rotate-45">
        {theme === 'dark' ? (
          <Sun className="w-4 h-4 text-blue-400" />
        ) : (
          <Moon className="w-4 h-4 text-blue-600" />
        )}
      </div>
    </button>
  );
};

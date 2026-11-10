import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ variant = 'icon', className = '' }) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === 'segmented') {
    return (
      <div className={`theme-segmented-control ${className}`} role="radiogroup" aria-label="Chọn giao diện">
        <button
          type="button"
          className={`theme-segment-btn ${theme === 'light' ? 'active' : ''}`}
          onClick={() => setTheme('light')}
          title="Chế độ sáng"
          role="radio" aria-checked={theme === 'light'}
        >
          <Sun size={14} />
          <span>Sáng</span>
        </button>

        <button
          type="button"
          className={`theme-segment-btn ${theme === 'dark' ? 'active' : ''}`}
          onClick={() => setTheme('dark')}
          title="Chế độ tối"
          role="radio" aria-checked={theme === 'dark'}
        >
          <Moon size={14} />
          <span>Tối</span>
        </button>

        <button
          type="button"
          className={`theme-segment-btn ${theme === 'system' ? 'active' : ''}`}
          onClick={() => setTheme('system')}
          title="Tự động theo hệ thống"
          role="radio" aria-checked={theme === 'system'}
        >
          <Monitor size={14} />
          <span>Hệ thống</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      title={`Giao diện hiện tại: ${
        theme === 'system'
          ? `Hệ thống (${resolvedTheme === 'dark' ? 'Tối' : 'Sáng'})`
          : theme === 'dark'
          ? 'Tối'
          : 'Sáng'
      }. Bấm để đổi.`}
      aria-label="Đổi chế độ sáng / tối"
    >
      {resolvedTheme === 'dark' ? (
        <Moon size={18} className="theme-icon moon" />
      ) : (
        <Sun size={18} className="theme-icon sun" />
      )}
      {theme === 'system' && <span className="theme-auto-badge">Auto</span>}
    </button>
  );
}

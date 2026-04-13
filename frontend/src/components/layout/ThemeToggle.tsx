import { useAppStore } from '../../stores/appStore';
import { Sun, Moon } from 'lucide-react';
import './ThemeToggle.css';

export default function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const { theme, toggleTheme } = useAppStore();
  const isDark = theme === 'dark';

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label="Toggle theme"
      id="theme-toggle-btn"
    >
      <div className={`theme-toggle__track ${isDark ? 'theme-toggle__track--dark' : 'theme-toggle__track--light'}`}>
        <div className={`theme-toggle__thumb ${isDark ? 'theme-toggle__thumb--dark' : 'theme-toggle__thumb--light'}`}>
          {isDark ? <Moon size={12} /> : <Sun size={12} />}
        </div>
        <div className="theme-toggle__icons">
          <Sun size={10} className="theme-toggle__sun-bg" />
          <Moon size={10} className="theme-toggle__moon-bg" />
        </div>
      </div>
      {!collapsed && (
        <span className="theme-toggle__label">
          {isDark ? 'Oscuro' : 'Claro'}
        </span>
      )}
    </button>
  );
}

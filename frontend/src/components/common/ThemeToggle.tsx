import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m9.75-9h-2.25M3.75 12h2.25m16.5-12.375l-1.591 1.591M13.966 13.966l-1.591 1.591m0-11.932l1.591 1.591M20.159 20.159l-1.591 1.591M12 18.75a6.75 6.75 0 100-13.5 6.75 6.75 0 000 13.5z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  );
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </svg>
  );
}

function LaptopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h12A2.25 2.25 0 0120.25 6v9.75A2.25 2.25 0 0118 18.75H6a2.25 2.25 0 01-2.25-2.25V6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 18.75h16.5" />
    </svg>
  );
}

export default function ThemeToggle() {
  const { theme, toggleTheme, resetToSystemTheme, themeSource, systemTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const isFollowingSystem = themeSource === 'system';
  const isDark = theme === 'dark';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(prev => !prev)}
        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:opacity-80 transition-all border border-gray-200 dark:border-gray-700 shadow-sm"
        aria-label="Theme settings"
        title={
          isFollowingSystem
            ? `Following system theme (${systemTheme})`
            : `Manually set to ${theme}`
        }
      >
        {isDark ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-base bg-page shadow-xl z-50 p-2 space-y-1">
          <div className="px-3 py-2 text-xs font-medium text-secondary border-b border-base mb-1 flex items-center gap-2">
            <LaptopIcon className="w-3.5 h-3.5" />
            Theme Settings
          </div>

          <div className="px-3 py-1.5 text-xs text-secondary flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${isDark ? 'bg-indigo-400' : 'bg-amber-400'}`} />
            <span>
              {isFollowingSystem
                ? `Following OS (${systemTheme === 'dark' ? 'Dark' : 'Light'})`
                : `Manual: ${isDark ? 'Dark' : 'Light'} mode`}
            </span>
          </div>

          <button
            onClick={() => {
              toggleTheme();
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-primary hover:bg-gray-500/10 transition-colors"
          >
            {isDark ? (
              <SunIcon className="w-4 h-4 text-amber-500" />
            ) : (
              <MoonIcon className="w-4 h-4 text-indigo-500" />
            )}
            <span>Switch to {isDark ? 'Light' : 'Dark'} Mode</span>
          </button>

          {!isFollowingSystem && (
            <button
              onClick={() => {
                resetToSystemTheme();
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-primary hover:bg-gray-500/10 transition-colors"
            >
              <MonitorIcon className="w-4 h-4 text-emerald-500" />
              <span>Follow System Theme</span>
            </button>
          )}

          {isFollowingSystem && (
            <div className="px-3 py-2.5 text-xs text-secondary italic border-t border-base mt-1 pt-2 flex items-center gap-2">
              <MonitorIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Automatically matches your device. Toggle above to override.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
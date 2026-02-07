// ============================================================================
// Theme Context
// ============================================================================

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export type ThemeOption = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeOption;
  setTheme: (theme: ThemeOption) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ============================================================================
// Dark Mode Color Palette
// ============================================================================

const darkThemeColors = `
  /* Dark Theme - Slate Palette */
  [data-theme="dark"] {
    /* Primary Colors */
    --color-primary: #818cf8;
    --color-primary-dark: #6366f1;
    --color-primary-light: #a5b4fc;
    
    /* Backgrounds */
    --color-bg-primary: #0f172a;
    --color-bg-secondary: #1e293b;
    --color-bg-tertiary: #334155;
    --color-bg-hover: #475569;
    
    /* Text */
    --color-text-primary: #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-text-muted: #64748b;
    
    /* Borders */
    --color-border: #334155;
    --color-border-light: #475569;
    
    /* Status Colors */
    --color-success: #4ade80;
    --color-warning: #fbbf24;
    --color-error: #f87171;
    --color-info: #60a5fa;
    
    /* Sidebar Dark */
    --sidebar-bg: #0f172a;
    --sidebar-border: #334155;
    --sidebar-text: #f1f5f9;
    --sidebar-hover: #1e293b;
    
    /* Card Dark */
    --card-bg: #1e293b;
    --card-border: #334155;
  }
`;

// ============================================================================
// Provider Component
// ============================================================================

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeOption>(() => {
    // Check localStorage first
    const stored = localStorage.getItem('theme') as ThemeOption;
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored;
    }
    // Default to system preference
    return 'system';
  });
  
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Apply CSS for dark mode colors
  useEffect(() => {
    // Inject dark theme CSS
    const styleId = 'dark-theme-styles';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.innerHTML = darkThemeColors;
      document.head.appendChild(styleEl);
    }
  }, []);

  // Resolve theme
  useEffect(() => {
    const resolveTheme = () => {
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
      }
      return theme as 'light' | 'dark';
    };

    const resolved = resolveTheme();
    setResolvedTheme(resolved);
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', resolved);
    
    // Store in localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Listen for system preference changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const prefersDark = mediaQuery.matches;
      setResolvedTheme(prefersDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: ThemeOption) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// ============================================================================
// Theme Toggle Component
// ============================================================================

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (theme === 'light') return '☀️';
    if (theme === 'dark') return '🌙';
    return '💻'; // System
  };

  const getLabel = () => {
    if (theme === 'light') return 'Light';
    if (theme === 'dark') return 'Dark';
    return 'System';
  };

  return (
    <button 
      className="theme-toggle"
      onClick={toggleTheme}
      title={`Current: ${getLabel()} (click to cycle)`}
    >
      <span className="theme-icon">{getIcon()}</span>
      <span className="theme-label">{getLabel()}</span>
    </button>
  );
}

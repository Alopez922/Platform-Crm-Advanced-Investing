import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface AppState {
  activeCompanyId: string | null;
  activeCompanySlug: string | null;
  activeCompanyColor: string;
  sidebarOpen: boolean;
  selectedLeadId: string | null;
  drawerOpen: boolean;
  theme: Theme;
  
  setActiveCompany: (id: string, slug: string, color: string) => void;
  toggleSidebar: () => void;
  openLeadDrawer: (leadId: string) => void;
  closeLeadDrawer: () => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('leadpilot-theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  return 'dark';
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('leadpilot-theme', theme);
}

// Apply saved theme immediately on load
const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const useAppStore = create<AppState>((set) => ({
  activeCompanyId: null,
  activeCompanySlug: null,
  activeCompanyColor: '#2596DC',
  sidebarOpen: true,
  selectedLeadId: null,
  drawerOpen: false,
  theme: initialTheme,

  setActiveCompany: (id, slug, color) => 
    set({ activeCompanyId: id, activeCompanySlug: slug, activeCompanyColor: color }),

  toggleSidebar: () => 
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  openLeadDrawer: (leadId) => 
    set({ selectedLeadId: leadId, drawerOpen: true }),

  closeLeadDrawer: () => 
    set({ selectedLeadId: null, drawerOpen: false }),

  toggleTheme: () =>
    set((state) => {
      const newTheme: Theme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      return { theme: newTheme };
    }),

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
}));

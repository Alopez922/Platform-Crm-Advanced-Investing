import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAppStore } from './stores/appStore';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import CompanyBoardPage from './pages/CompanyBoardPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const theme = useAppStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/empresa/:slug" element={<CompanyBoardPage />} />
          </Route>
        </Routes>
      </BrowserRouter>

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: isDark ? '#161b22' : '#ffffff',
            color: isDark ? '#e6edf3' : '#1a1d23',
            border: `1px solid ${isDark ? '#30363d' : '#e0e4ea'}`,
            borderRadius: '10px',
            fontSize: '14px',
          },
        }}
      />
    </QueryClientProvider>
  );
}


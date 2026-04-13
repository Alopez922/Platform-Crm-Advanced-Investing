import { useState } from 'react';
import { Search, Filter, RefreshCw, LayoutDashboard, Archive, Settings, Zap } from 'lucide-react';
import { useSources } from '../../hooks/useQueries';
import NotificationBell from '../layout/NotificationBell';
import './BoardToolbar.css';

interface Props {
  companyId: string;
  companyName: string;
  companyColor: string;
  syncStatus?: string | null;
  lastSyncAt?: string | null;
  leadCount: number;
  activeTab: 'kanban' | 'archivados' | 'secuencias';
  onTabChange: (tab: 'kanban' | 'archivados' | 'secuencias') => void;
  onFilterChange: (filters: { source?: string; search?: string }) => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
}

export default function BoardToolbar({
  companyId,
  companyName,
  companyColor,
  leadCount,
  activeTab,
  onTabChange,
  onFilterChange,
  onRefresh,
  onOpenSettings,
}: Props) {
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const { data: sources } = useSources(companyId);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFilterChange({ source: source || undefined, search: value || undefined });
  };

  const handleSourceChange = (value: string) => {
    setSource(value);
    onFilterChange({ source: value || undefined, search: search || undefined });
  };

  return (
    <div className="board-toolbar">
      <div className="board-toolbar__left">
        <div className="board-toolbar__company" style={{ '--accent': companyColor } as React.CSSProperties}>
          <div className="board-toolbar__dot" style={{ background: companyColor }} />
          <h1 className="board-toolbar__title">{companyName}</h1>
          <span className="board-toolbar__count">{leadCount} leads</span>
        </div>

        {/* Tabs */}
        <div className="board-toolbar__tabs">
          <button
            className={`board-toolbar__tab ${activeTab === 'kanban' ? 'board-toolbar__tab--active' : ''}`}
            onClick={() => onTabChange('kanban')}
          >
            <LayoutDashboard size={14} />
            Kanban
          </button>
          <button
            className={`board-toolbar__tab ${activeTab === 'archivados' ? 'board-toolbar__tab--active' : ''}`}
            onClick={() => onTabChange('archivados')}
          >
            <Archive size={14} />
            Archivados
          </button>
          <button
            className={`board-toolbar__tab ${activeTab === 'secuencias' ? 'board-toolbar__tab--active' : ''}`}
            onClick={() => onTabChange('secuencias')}
          >
            <Zap size={14} />
            Secuencias
          </button>
        </div>
      </div>

      <div className="board-toolbar__right">
        {/* Buscador */}
        <div className="board-toolbar__search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Buscar lead..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="board-toolbar__search-input"
          />
        </div>

        {/* Filtro por fuente */}
        <div className="board-toolbar__filter">
          <Filter size={15} />
          <select
            value={source}
            onChange={(e) => handleSourceChange(e.target.value)}
            className="board-toolbar__select"
          >
            <option value="">Todas las fuentes</option>
            {sources?.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Notificaciones */}
        <NotificationBell />

        {/* Refresh */}
        <button className="board-toolbar__btn" onClick={onRefresh} title="Actualizar">
          <RefreshCw size={16} />
        </button>

        {/* Configuración */}
        <button className="board-toolbar__btn" onClick={onOpenSettings} title="Configuración de empresa">
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}

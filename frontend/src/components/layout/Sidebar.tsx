import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCompanies } from '../../hooks/useQueries';
import { useAppStore } from '../../stores/appStore';
import {
  LayoutDashboard,
  Plus,
  ChevronLeft,
  ChevronRight,
  Zap,
  Settings
} from 'lucide-react';
import CreateCompanyModal from './CreateCompanyModal';
import ThemeToggle from './ThemeToggle';
import './Sidebar.css';

export default function Sidebar() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { data: companies, isLoading } = useCompanies();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--collapsed'}`}>
      {/* Logo */}
      <div className="sidebar__logo" onClick={() => navigate('/')}>
        <Zap className="sidebar__logo-icon" />
        {sidebarOpen && <span className="sidebar__logo-text">LeadPilot</span>}
      </div>

      {/* Toggle */}
      <button className="sidebar__toggle" onClick={toggleSidebar} title="Toggle sidebar">
        {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Dashboard link */}
      <div className="sidebar__section">
        <button
          className={`sidebar__item ${!slug ? 'sidebar__item--active' : ''}`}
          onClick={() => navigate('/')}
        >
          <LayoutDashboard size={18} />
          {sidebarOpen && <span>Dashboard</span>}
        </button>
      </div>

      {/* Empresas / Pestañas */}
      <div className="sidebar__section">
        {sidebarOpen && <div className="sidebar__section-title">EMPRESAS</div>}
        
        {isLoading ? (
          <div className="sidebar__loading">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton sidebar__skeleton" />
            ))}
          </div>
        ) : (
          companies?.map((company) => (
            <button
              key={company.id}
              className={`sidebar__item sidebar__company ${
                slug === company.slug ? 'sidebar__item--active' : ''
              }`}
              style={{
                '--company-color': company.color,
              } as React.CSSProperties}
              onClick={() => navigate(`/empresa/${company.slug}`)}
              title={company.name}
            >
              <div
                className="sidebar__company-dot"
                style={{ background: company.color }}
              />
              {sidebarOpen && (
                <div className="sidebar__company-info">
                  <span className="sidebar__company-name">{company.name}</span>
                  <span className="sidebar__company-count">
                    {company._count?.leads || 0} leads
                  </span>
                </div>
              )}
            </button>
          ))
        )}

        {sidebarOpen && (
          <button
            className="sidebar__item sidebar__add-company"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={18} />
            <span>Agregar Empresa</span>
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar__footer">
        <ThemeToggle collapsed={!sidebarOpen} />
        <button className="sidebar__item" onClick={() => navigate('/configuracion')}>
          <Settings size={18} />
          {sidebarOpen && <span>Configuración</span>}
        </button>
      </div>

      {/* Modal crear empresa */}
      {showCreateModal && (
        <CreateCompanyModal onClose={() => setShowCreateModal(false)} />
      )}
    </aside>
  );
}

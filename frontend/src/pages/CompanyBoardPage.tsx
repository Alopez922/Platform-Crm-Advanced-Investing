import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useCompanyBySlug, useBoard } from '../hooks/useQueries';
import { useAppStore } from '../stores/appStore';
import KanbanBoard from '../components/board/KanbanBoard';
import BoardToolbar from '../components/board/BoardToolbar';
import LeadDetailDrawer from '../components/lead/LeadDetailDrawer';
import ArchivedLeads from '../components/lead/ArchivedLeads';
import CompanySettingsModal from '../components/layout/CompanySettingsModal';
import SequenceManager from '../components/sequence/SequenceManager';
import './CompanyBoardPage.css';

export default function CompanyBoardPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: company } = useCompanyBySlug(slug);
  const { setActiveCompany } = useAppStore();
  const [activeTab, setActiveTab] = useState<'kanban' | 'archivados' | 'secuencias'>('kanban');
  const [filters, setFilters] = useState<{ source?: string; search?: string }>({});
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (company) {
      setActiveCompany(company.id, company.slug, company.color);
    }
  }, [company, setActiveCompany]);

  // Reset tab when company changes
  useEffect(() => { setActiveTab('kanban'); }, [slug]);

  const { data: board, isLoading, refetch } = useBoard(
    company?.id || null,
    filters
  );

  const totalLeads = useMemo(
    () => board?.reduce((sum, stage) => sum + (stage.leads?.length || 0), 0) || 0,
    [board]
  );

  if (!company) {
    return (
      <div className="board-page__loading">
        <div className="skeleton" style={{ width: 200, height: 30, marginBottom: 16 }} />
        <div className="kanban-board">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ width: 300, height: '80%', borderRadius: 14 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="board-page">
      <BoardToolbar
        companyId={company.id}
        companyName={company.name}
        companyColor={company.color}
        leadCount={totalLeads}
        syncStatus={company.sheetConnection?.syncStatus}
        lastSyncAt={company.sheetConnection?.lastSyncAt}
        onFilterChange={setFilters}
        onRefresh={() => refetch()}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setShowSettings(true)}
      />

      <div className="board-page__content">
        {activeTab === 'kanban' ? (
          isLoading ? (
            <div className="kanban-board" style={{ padding: 16 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton" style={{ width: 300, height: '70%', borderRadius: 14, flexShrink: 0 }} />
              ))}
            </div>
          ) : board ? (
            <KanbanBoard stages={board} companyId={company.id} />
          ) : null
        ) : activeTab === 'archivados' ? (
          <ArchivedLeads companyId={company.id} />
        ) : (
          <SequenceManager />
        )}
      </div>

      <LeadDetailDrawer />

      {showSettings && company && (
        <CompanySettingsModal
          company={company}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

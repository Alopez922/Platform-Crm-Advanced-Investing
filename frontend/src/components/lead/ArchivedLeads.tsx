import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '../../api';
import { RotateCcw, Mail, Phone, Calendar, Archive, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import './ArchivedLeads.css';

interface Props {
  companyId: string;
}

export default function ArchivedLeads({ companyId }: Props) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['leads-archived', companyId],
    queryFn: async () => {
      const res = await leadsApi.getAll(companyId, { isArchived: true, limit: 200 });
      return res.data;
    },
  });

  // Restaurar lead individual
  const restoreMutation = useMutation({
    mutationFn: async (leadId: string) =>
      leadsApi.update(companyId, leadId, { isArchived: false } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-archived', companyId] });
      queryClient.invalidateQueries({ queryKey: ['board', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Lead restaurado al tablero');
    },
    onError: () => toast.error('Error al restaurar'),
  });

  // Eliminar todos los archivados permanentemente
  const clearAllMutation = useMutation({
    mutationFn: async () => leadsApi.deleteAllArchived(companyId),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['leads-archived', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success(res.data?.message || 'Archivados eliminados');
    },
    onError: () => toast.error('Error al eliminar archivados'),
  });

  function handleClearAll() {
    const leads = data?.leads || data || [];
    if (leads.length === 0) return;
    if (!confirm(`¿Eliminar permanentemente los ${leads.length} leads archivados? Esta acción NO se puede deshacer.`))
      return;
    clearAllMutation.mutate();
  }

  const leads = data?.leads || data || [];

  if (isLoading) {
    return (
      <div className="archived__loading">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton archived__skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="archived">
      <div className="archived__header">
        <Archive size={16} />
        <span>Leads archivados</span>
        <span className="archived__count">{leads.length}</span>

        {leads.length > 0 && (
          <button
            className="archived__clear-btn"
            onClick={handleClearAll}
            disabled={clearAllMutation.isPending}
            title="Eliminar todos los archivados permanentemente"
          >
            <Trash2 size={13} />
            {clearAllMutation.isPending ? 'Eliminando...' : 'Vaciar todo'}
          </button>
        )}
      </div>

      {leads.length === 0 ? (
        <div className="archived__empty">
          <Archive size={32} />
          <p>No hay leads archivados</p>
        </div>
      ) : (
        <div className="archived__list">
          {leads.map((lead: any) => (
            <div key={lead.id} className="archived__item">
              <div className="archived__item-info">
                <div className="archived__item-name">{lead.fullName}</div>
                <div className="archived__item-details">
                  {lead.email && (
                    <span className="archived__item-detail">
                      <Mail size={11} /> {lead.email}
                    </span>
                  )}
                  {lead.phone && (
                    <span className="archived__item-detail">
                      <Phone size={11} /> {lead.phone}
                    </span>
                  )}
                  {lead.source && (
                    <span className="archived__item-source">{lead.source}</span>
                  )}
                </div>
                <div className="archived__item-date">
                  <Calendar size={10} />
                  Archivado: {format(new Date(lead.updatedAt), 'dd MMM yyyy', { locale: es })}
                </div>
              </div>

              <div className="archived__item-actions">
                {lead.stage && (
                  <span
                    className="archived__item-stage"
                    style={{ background: lead.stage.color + '20', color: lead.stage.color }}
                  >
                    {lead.stage.name}
                  </span>
                )}
                <button
                  className="archived__restore-btn"
                  onClick={() => restoreMutation.mutate(lead.id)}
                  disabled={restoreMutation.isPending}
                  title="Restaurar al tablero"
                >
                  <RotateCcw size={14} />
                  Restaurar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

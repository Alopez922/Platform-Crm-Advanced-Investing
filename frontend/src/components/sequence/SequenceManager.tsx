import { useState } from 'react';
import { Plus, Edit2, Trash2, Zap, ToggleLeft, ToggleRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sequencesApi, type Sequence } from '../../api/sequences';
import { useAppStore } from '../../stores/appStore';
import SequenceBuilder from './SequenceBuilder';
import toast from 'react-hot-toast';
import './SequenceManager.css';

export default function SequenceManager() {
  const { activeCompanyId } = useAppStore();
  const queryClient = useQueryClient();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingSequence, setEditingSequence] = useState<Sequence | undefined>();

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['sequences', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const res = await sequencesApi.getAll(activeCompanyId);
      return res.data as Sequence[];
    },
    enabled: !!activeCompanyId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sequencesApi.delete(activeCompanyId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences', activeCompanyId] });
      toast.success('Secuencia eliminada');
    },
    onError: () => toast.error('Error al eliminar'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      sequencesApi.update(activeCompanyId!, id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences', activeCompanyId] });
    },
  });

  function handleEdit(seq: Sequence) {
    setEditingSequence(seq);
    setShowBuilder(true);
  }

  function handleCloseBuilder() {
    setShowBuilder(false);
    setEditingSequence(undefined);
  }

  if (!activeCompanyId) {
    return (
      <div className="seqmgr-empty">
        <Zap size={40} />
        <p>Selecciona una empresa para ver sus secuencias</p>
      </div>
    );
  }

  return (
    <div className="seqmgr">
      {/* Header */}
      <div className="seqmgr-header">
        <div>
          <h2 className="seqmgr-title"><Zap size={20} /> Secuencias de Seguimiento</h2>
          <p className="seqmgr-subtitle">
            Crea flujos automáticos de emails para tus leads. Cada secuencia puede tener múltiples pasos con delays y horarios personalizados.
          </p>
        </div>
        <button className="seqmgr-btn-create" onClick={() => setShowBuilder(true)}>
          <Plus size={16} /> Nueva Secuencia
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="seqmgr-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="seqmgr-skeleton" />
          ))}
        </div>
      ) : sequences.length === 0 ? (
        <div className="seqmgr-empty">
          <div className="seqmgr-empty-icon">📧</div>
          <h3>Sin secuencias todavía</h3>
          <p>Crea tu primera secuencia de seguimiento automático para tus leads</p>
          <button className="seqmgr-btn-create" onClick={() => setShowBuilder(true)}>
            <Plus size={14} /> Crear primera secuencia
          </button>
        </div>
      ) : (
        <div className="seqmgr-grid">
          {sequences.map((seq) => (
            <div key={seq.id} className={`seqmgr-card ${!seq.isActive ? 'seqmgr-card--inactive' : ''}`}>
              {/* Card Header */}
              <div className="seqmgr-card-header">
                <div className="seqmgr-card-icon">📧</div>
                <div className="seqmgr-card-info">
                  <h3 className="seqmgr-card-name">{seq.name}</h3>
                  {seq.description && (
                    <p className="seqmgr-card-desc">{seq.description}</p>
                  )}
                </div>
                <button
                  className="seqmgr-toggle-btn"
                  onClick={() => toggleActiveMutation.mutate({ id: seq.id, isActive: !seq.isActive })}
                  title={seq.isActive ? 'Desactivar' : 'Activar'}
                >
                  {seq.isActive
                    ? <ToggleRight size={22} color="#3fb950" />
                    : <ToggleLeft size={22} color="#8b949e" />
                  }
                </button>
              </div>

              {/* Badges */}
              <div className="seqmgr-badges">
                <span className={`seqmgr-badge ${seq.isActive ? 'seqmgr-badge--active' : 'seqmgr-badge--inactive'}`}>
                  {seq.isActive ? '● Activa' : '○ Inactiva'}
                </span>
                {seq.isAutoAssign && (
                  <span className="seqmgr-badge seqmgr-badge--auto">
                    ⚡ Auto-asignar
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="seqmgr-stats">
                <div className="seqmgr-stat">
                  <span className="seqmgr-stat-value">{seq.steps.length}</span>
                  <span className="seqmgr-stat-label">Pasos</span>
                </div>
                <div className="seqmgr-stat">
                  <span className="seqmgr-stat-value">{seq._count?.enrollments ?? 0}</span>
                  <span className="seqmgr-stat-label">Leads inscritos</span>
                </div>
              </div>

              {/* Steps preview */}
              <div className="seqmgr-steps-preview">
                {seq.steps.slice(0, 3).map((step, i) => (
                  <div key={step.id} className="seqmgr-step-row">
                    <span className="seqmgr-step-num">{i + 1}</span>
                    <span className="seqmgr-step-subject">{step.subject}</span>
                    {step.delayMinutes > 0 && (
                      <span className="seqmgr-step-delay">
                        +{step.delayMinutes >= 1440
                          ? `${Math.round(step.delayMinutes / 1440)}d`
                          : step.delayMinutes >= 60
                          ? `${Math.round(step.delayMinutes / 60)}h`
                          : `${step.delayMinutes}m`}
                      </span>
                    )}
                  </div>
                ))}
                {seq.steps.length > 3 && (
                  <div className="seqmgr-step-more">+{seq.steps.length - 3} pasos más...</div>
                )}
              </div>

              {/* Actions */}
              <div className="seqmgr-actions">
                <button className="seqmgr-action-btn" onClick={() => handleEdit(seq)}>
                  <Edit2 size={13} /> Editar
                </button>
                <button
                  className="seqmgr-action-btn seqmgr-action-btn--danger"
                  onClick={() => {
                    if (confirm(`¿Eliminar la secuencia "${seq.name}"? Esta acción no se puede deshacer.`)) {
                      deleteMutation.mutate(seq.id);
                    }
                  }}
                >
                  <Trash2 size={13} /> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Builder Modal */}
      {showBuilder && activeCompanyId && (
        <SequenceBuilder
          companyId={activeCompanyId}
          sequence={editingSequence}
          onClose={handleCloseBuilder}
        />
      )}
    </div>
  );
}

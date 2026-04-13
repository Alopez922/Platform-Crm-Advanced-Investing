import { useState } from 'react';
import { Plus, X, Play, Pause, XCircle, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sequencesApi, type SequenceEnrollment, type Sequence } from '../../api/sequences';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import './Sequences.css';

interface Props {
  companyId: string;
  leadId: string;
  leadEmail?: string | null;
}

export default function LeadSequences({ companyId, leadId, leadEmail }: Props) {
  const queryClient = useQueryClient();
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);

  // Inscripciones del lead
  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['lead-enrollments', leadId],
    queryFn: async () => {
      const res = await sequencesApi.getLeadEnrollments(companyId, leadId);
      return res.data as SequenceEnrollment[];
    },
    enabled: !!leadId,
  });

  // Todas las secuencias disponibles (para el modal de enrollment)
  const { data: sequences = [] } = useQuery({
    queryKey: ['sequences', companyId],
    queryFn: async () => {
      const res = await sequencesApi.getAll(companyId);
      return res.data as Sequence[];
    },
    enabled: showEnrollModal,
  });

  const enrollMutation = useMutation({
    mutationFn: (seqId: string) => sequencesApi.enrollLead(companyId, seqId, leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-enrollments', leadId] });
      toast.success('Lead inscrito en la secuencia ✅');
      setShowEnrollModal(false);
      setSelectedSequenceId(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Error al inscribir'),
  });

  const pauseMutation = useMutation({
    mutationFn: (enrollmentId: string) => sequencesApi.pauseEnrollment(companyId, enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-enrollments', leadId] });
      toast.success('Secuencia pausada');
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (enrollmentId: string) => sequencesApi.resumeEnrollment(companyId, enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-enrollments', leadId] });
      toast.success('Secuencia reanudada ▶️');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (enrollmentId: string) => sequencesApi.cancelEnrollment(companyId, enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-enrollments', leadId] });
      toast.success('Secuencia cancelada');
    },
  });

  function getStatusBadge(status: SequenceEnrollment['status']) {
    const map: Record<string, { label: string; cls: string }> = {
      ACTIVE:    { label: 'Activa',      cls: 'ls-status-badge--active'    },
      PAUSED:    { label: 'Pausada',     cls: 'ls-status-badge--paused'    },
      COMPLETED: { label: 'Completada', cls: 'ls-status-badge--completed' },
      CANCELLED: { label: 'Cancelada',  cls: 'ls-status-badge--cancelled' },
    };
    const { label, cls } = map[status] || { label: status, cls: '' };
    return <span className={`ls-status-badge ${cls}`}>{label}</span>;
  }

  function getStepIcon(status: string) {
    const map: Record<string, { icon: React.ReactElement; cls: string }> = {
      SENT:      { icon: <CheckCircle size={12} />, cls: 'ls-step-icon--sent'      },
      SCHEDULED: { icon: <Clock size={12} />,       cls: 'ls-step-icon--scheduled' },
      FAILED:    { icon: <AlertCircle size={12} />, cls: 'ls-step-icon--failed'    },
      SKIPPED:   { icon: <XCircle size={12} />,     cls: 'ls-step-icon--skipped'   },
    };
    const { icon, cls } = map[status] || map.SCHEDULED;
    return <div className={`ls-step-icon ${cls}`}>{icon}</div>;
  }

  const activeSequenceIds = new Set(enrollments.filter(e => e.status === 'ACTIVE').map(e => e.sequenceId));

  if (isLoading) return null;

  return (
    <div className="ls-section">
      {enrollments.length === 0 ? (
        <p className="lead-drawer__empty">Sin secuencias activas — asigna una para automatizar el seguimiento</p>
      ) : (
        enrollments.map((enrollment) => {
          const sent = enrollment.executions.filter(e => e.status === 'SENT').length;
          const total = enrollment.executions.length;
          const pct = total > 0 ? Math.round((sent / total) * 100) : 0;

          return (
            <div key={enrollment.id} className="ls-enrollment">
              {/* Header */}
              <div className="ls-enrollment-header">
                <div className="ls-enrollment-name">
                  📧 {enrollment.sequence.name}
                  {getStatusBadge(enrollment.status)}
                </div>
                <div className="ls-enrollment-actions">
                  {enrollment.status === 'ACTIVE' && (
                    <button
                      className="ls-action-btn"
                      onClick={() => pauseMutation.mutate(enrollment.id)}
                      title="Pausar"
                    ><Pause size={10} /> Pausar</button>
                  )}
                  {enrollment.status === 'PAUSED' && (
                    <button
                      className="ls-action-btn"
                      onClick={() => resumeMutation.mutate(enrollment.id)}
                      title="Reanudar"
                    ><Play size={10} /> Reanudar</button>
                  )}
                  {(enrollment.status === 'ACTIVE' || enrollment.status === 'PAUSED') && (
                    <button
                      className="ls-action-btn ls-action-btn--cancel"
                      onClick={() => cancelMutation.mutate(enrollment.id)}
                      title="Cancelar"
                    ><X size={10} /> Cancelar</button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {total > 0 && (
                <div className="ls-progress">
                  <div className="ls-progress-bar-bg">
                    <div className="ls-progress-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="ls-progress-text">{sent}/{total} pasos completados</div>
                </div>
              )}

              {/* Steps timeline */}
              <div className="ls-steps">
                {enrollment.executions.map((exec) => (
                  <div key={exec.id} className="ls-step">
                    {getStepIcon(exec.status)}
                    <div className="ls-step-info">
                      <div className="ls-step-subject">{exec.step.subject}</div>
                      <div className="ls-step-time">
                        {exec.status === 'SENT' && exec.executedAt
                          ? `✅ Enviado ${format(new Date(exec.executedAt), "dd MMM, HH:mm", { locale: es })}`
                          : exec.status === 'SCHEDULED'
                          ? `⏳ Programado ${format(new Date(exec.scheduledAt), "dd MMM, HH:mm", { locale: es })}`
                          : exec.status === 'FAILED'
                          ? `❌ Falló — ${exec.errorMessage}`
                          : `⏭ Omitido`
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Botón para inscribir en nueva secuencia */}
      {!leadEmail && (
        <p style={{ fontSize: 11, color: '#f85149', marginTop: 8 }}>
          ⚠️ Este lead no tiene email — los emails no se enviarán
        </p>
      )}
      <button className="ls-enroll-btn" onClick={() => setShowEnrollModal(true)}>
        <Plus size={13} /> Asignar secuencia
      </button>

      {/* Modal para elegir secuencia */}
      {showEnrollModal && (
        <div className="ls-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowEnrollModal(false)}>
          <div className="ls-modal">
            <div className="ls-modal-header">
              <h3>📧 Asignar secuencia al lead</h3>
              <button className="sb-close" onClick={() => setShowEnrollModal(false)}><X size={16} /></button>
            </div>

            <div className="ls-modal-body">
              {sequences.filter(s => s.isActive).length === 0 ? (
                <p style={{ color: '#8b949e', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                  No hay secuencias activas. Créalas desde la configuración de la empresa.
                </p>
              ) : (
                sequences.filter(s => s.isActive).map((seq) => {
                  const isAlreadyActive = activeSequenceIds.has(seq.id);
                  return (
                    <div
                      key={seq.id}
                      className={`ls-sequence-option ${selectedSequenceId === seq.id ? 'ls-sequence-option--selected' : ''} ${isAlreadyActive ? 'ls-sequence-option--disabled' : ''}`}
                      onClick={() => !isAlreadyActive && setSelectedSequenceId(seq.id)}
                      style={isAlreadyActive ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                      <div className="ls-sequence-option-icon">📧</div>
                      <div className="ls-sequence-option-info">
                        <div className="ls-sequence-option-name">
                          {seq.name} {isAlreadyActive && '(ya activa)'}
                        </div>
                        <div className="ls-sequence-option-steps">
                          {seq.steps.length} paso{seq.steps.length !== 1 ? 's' : ''} · {seq.description || 'Sin descripción'}
                        </div>
                      </div>
                      {selectedSequenceId === seq.id && <CheckCircle size={16} color="#3fb950" />}
                    </div>
                  );
                })
              )}
            </div>

            <div className="ls-modal-footer">
              <button className="sb-btn-cancel" onClick={() => setShowEnrollModal(false)}>Cancelar</button>
              <button
                className="sb-btn-save"
                disabled={!selectedSequenceId || enrollMutation.isPending}
                onClick={() => selectedSequenceId && enrollMutation.mutate(selectedSequenceId)}
              >
                {enrollMutation.isPending ? 'Inscribiendo...' : '✅ Inscribir lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

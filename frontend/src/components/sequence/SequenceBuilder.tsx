import { useState } from 'react';
import { X, Plus, Trash2, Mail, Clock, Save } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sequencesApi, type Sequence } from '../../api/sequences';
import toast from 'react-hot-toast';
import './Sequences.css';

interface Props {
  companyId: string;
  sequence?: Sequence; // Si se pasa, es edición
  onClose: () => void;
}

interface StepDraft {
  position: number;
  delayMinutes: number;
  sendAtTime: string;
  subject: string;
  bodyHtml: string;
}

const DEFAULT_STEP: Omit<StepDraft, 'position'> = {
  delayMinutes: 0,
  sendAtTime: '',
  subject: '',
  bodyHtml: '',
};

export default function SequenceBuilder({ companyId, sequence, onClose }: Props) {
  const queryClient = useQueryClient();
  const isEditing = !!sequence;

  const [name, setName] = useState(sequence?.name ?? '');
  const [description, setDescription] = useState(sequence?.description ?? '');
  const [isAutoAssign, setIsAutoAssign] = useState(sequence?.isAutoAssign ?? false);
  const [steps, setSteps] = useState<StepDraft[]>(
    sequence?.steps.map((s) => ({
      position: s.position,
      delayMinutes: s.delayMinutes,
      sendAtTime: s.sendAtTime ?? '',
      subject: s.subject,
      bodyHtml: s.bodyHtml,
    })) ?? [{ position: 1, ...DEFAULT_STEP }]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description: description || undefined,
        isAutoAssign,
        steps: steps.map((s, i) => ({
          position: i + 1,
          channel: 'EMAIL' as const,
          delayMinutes: s.delayMinutes,
          sendAtTime: s.sendAtTime || undefined,
          subject: s.subject,
          bodyHtml: s.bodyHtml,
        })),
      };
      if (isEditing) {
        return sequencesApi.update(companyId, sequence.id, payload);
      }
      return sequencesApi.create(companyId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences', companyId] });
      toast.success(isEditing ? 'Secuencia actualizada ✅' : 'Secuencia creada ✅');
      onClose();
    },
    onError: () => toast.error('Error al guardar la secuencia'),
  });

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { position: prev.length + 1, ...DEFAULT_STEP },
    ]);
  }

  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateStep(idx: number, field: keyof StepDraft, value: string | number) {
    setSteps((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function handleSave() {
    if (!name.trim()) return toast.error('El nombre es obligatorio');
    if (steps.length === 0) return toast.error('Agrega al menos un paso');
    for (const s of steps) {
      if (!s.subject.trim()) return toast.error('Todos los pasos necesitan asunto');
      if (!s.bodyHtml.trim()) return toast.error('Todos los pasos necesitan contenido');
    }
    saveMutation.mutate();
  }

  function formatDelay(minutes: number): string {
    if (minutes === 0) return 'Inmediato';
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)} día(s)`;
  }

  return (
    <div className="sb-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sb-modal">
        {/* Header */}
        <div className="sb-header">
          <h2><span>📧</span>{isEditing ? 'Editar Secuencia' : 'Nueva Secuencia de Seguimiento'}</h2>
          <button className="sb-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="sb-body">
          {/* Info básica */}
          <div className="sb-field">
            <label className="sb-label">Nombre de la secuencia *</label>
            <input
              id="seq-name"
              className="sb-input"
              placeholder="ej: Bienvenida nuevos leads"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="sb-field">
            <label className="sb-label">Descripción (opcional)</label>
            <input
              className="sb-input"
              placeholder="ej: Secuencia de 3 emails para leads de Google Ads"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="sb-toggle-row">
            <label className="sb-toggle">
              <input type="checkbox" checked={isAutoAssign} onChange={(e) => setIsAutoAssign(e.target.checked)} />
              <span className="sb-toggle-slider" />
            </label>
            <div>
              <span>Auto-asignar a nuevos leads</span>
              <small>Cuando caiga un lead nuevo, se inscribe automáticamente en esta secuencia</small>
            </div>
          </div>

          {/* Pasos */}
          <div>
            <p className="sb-steps-title">
              <Mail size={15} /> Pasos de la secuencia
              <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 12, color: '#8b949e' }}>
                Variables: {'{{nombre}} {{email}} {{telefono}} {{fuente}}'}
              </span>
            </p>

            {steps.map((step, idx) => (
              <div key={idx}>
                <div className="sb-step-card">
                  <div className="sb-step-header">
                    <div className="sb-step-badge">
                      <Mail size={11} /> Paso {idx + 1} — Email
                    </div>
                    {steps.length > 1 && (
                      <button className="sb-step-remove" onClick={() => removeStep(idx)}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <div className="sb-step-grid">
                    <div className="sb-field">
                      <label className="sb-label"><Clock size={10} /> Delay desde paso anterior</label>
                      <select
                        className="sb-input"
                        value={step.delayMinutes}
                        onChange={(e) => updateStep(idx, 'delayMinutes', Number(e.target.value))}
                      >
                        <option value={0}>Inmediato</option>
                        <option value={30}>30 minutos</option>
                        <option value={60}>1 hora</option>
                        <option value={180}>3 horas</option>
                        <option value={360}>6 horas</option>
                        <option value={720}>12 horas</option>
                        <option value={1440}>1 día</option>
                        <option value={2880}>2 días</option>
                        <option value={4320}>3 días</option>
                        <option value={10080}>1 semana</option>
                      </select>
                    </div>

                    <div className="sb-field">
                      <label className="sb-label">Enviar a hora específica (opcional)</label>
                      <input
                        type="time"
                        className="sb-input"
                        value={step.sendAtTime}
                        onChange={(e) => updateStep(idx, 'sendAtTime', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="sb-field" style={{ marginBottom: 10 }}>
                    <label className="sb-label">Asunto del email *</label>
                    <input
                      className="sb-input"
                      placeholder="ej: ¡Hola {{nombre}}! Gracias por tu interés"
                      value={step.subject}
                      onChange={(e) => updateStep(idx, 'subject', e.target.value)}
                    />
                  </div>

                  <div className="sb-field">
                    <label className="sb-label">Contenido del email * (HTML o texto plano)</label>
                    <textarea
                      className="sb-input sb-textarea"
                      placeholder={`Hola {{nombre}},\n\nGracias por contactarnos. Estamos listos para ayudarte...\n\nSaludos,\nEl equipo de Advanced Investing`}
                      value={step.bodyHtml}
                      onChange={(e) => updateStep(idx, 'bodyHtml', e.target.value)}
                      rows={4}
                    />
                  </div>

                  {step.delayMinutes > 0 || step.sendAtTime ? (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#8b949e' }}>
                      ⏰ Se enviará {step.delayMinutes > 0 ? `después de ${formatDelay(step.delayMinutes)}` : ''}
                      {step.sendAtTime ? ` a las ${step.sendAtTime}` : ''}
                    </div>
                  ) : null}
                </div>

                {idx < steps.length - 1 && (
                  <div className="sb-connector">luego</div>
                )}
              </div>
            ))}

            <button className="sb-add-step" onClick={addStep}>
              <Plus size={14} /> Agregar otro paso
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="sb-footer">
          <button className="sb-btn-cancel" onClick={onClose}>Cancelar</button>
          <button
            className="sb-btn-save"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            <Save size={14} />
            {saveMutation.isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear secuencia'}
          </button>
        </div>
      </div>
    </div>
  );
}

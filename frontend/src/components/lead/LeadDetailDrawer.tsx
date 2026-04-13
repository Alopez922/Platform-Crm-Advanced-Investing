import { useState } from 'react';
import {
  X, Mail, Phone, Calendar, Tag, Clock, User, Send, Plus, Zap,
  MessageCircle, CheckCircle2, CalendarPlus, AlertTriangle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLeadDetail } from '../../hooks/useQueries';
import { useAppStore } from '../../stores/appStore';
import { leadsApi, notesApi, followUpsApi } from '../../api';
import LeadSequences from '../sequence/LeadSequences';
import toast from 'react-hot-toast';
import './LeadDetailDrawer.css';

// Tags predefinidos con colores
const PRESET_TAGS = [
  { label: 'Contactado', color: '#3B82F6' },
  { label: 'No contesta', color: '#EF4444' },
  { label: 'Interesado', color: '#10B981' },
  { label: 'Llamar luego', color: '#F59E0B' },
  { label: 'Calificado', color: '#8B5CF6' },
  { label: 'Reunión agendada', color: '#EC4899' },
  { label: 'Propuesta enviada', color: '#06B6D4' },
  { label: 'Sin interés', color: '#6B7280' },
];

function getTagColor(tag: string): string {
  const preset = PRESET_TAGS.find((t) => t.label.toLowerCase() === tag.toLowerCase());
  if (preset) return preset.color;
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 60%, 55%)`;
}

function buildWhatsAppUrl(phone: string, name: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, '');
  const msg = encodeURIComponent(`Hola ${name}, soy de Advanced Investing. ¿Cómo estás?`);
  return `https://wa.me/${cleaned}?text=${msg}`;
}

export default function LeadDetailDrawer() {
  const { activeCompanyId, selectedLeadId, drawerOpen, closeLeadDrawer } = useAppStore();
  const { data: lead, isLoading } = useLeadDetail(activeCompanyId, selectedLeadId);
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  // Follow-up state
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('10:00');
  const [followUpNote, setFollowUpNote] = useState('');

  // Mutación para agregar nota
  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId || !selectedLeadId) return;
      return notesApi.create(activeCompanyId, selectedLeadId, noteText);
    },
    onSuccess: () => {
      setNoteText('');
      queryClient.invalidateQueries({ queryKey: ['lead', selectedLeadId] });
      queryClient.invalidateQueries({ queryKey: ['my-day'] });
      toast.success('Nota agregada');
    },
    onError: () => toast.error('Error al agregar nota'),
  });

  // Mutación para agregar/quitar tag
  const updateTagsMutation = useMutation({
    mutationFn: async (newTags: string[]) => {
      if (!activeCompanyId || !selectedLeadId) return;
      return leadsApi.update(activeCompanyId, selectedLeadId, { tags: newTags } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', selectedLeadId] });
      queryClient.invalidateQueries({ queryKey: ['board', activeCompanyId] });
    },
  });

  // Mutación para crear follow-up
  const createFollowUpMutation = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId || !selectedLeadId) return;
      const dueAt = `${followUpDate}T${followUpTime}:00`;
      return followUpsApi.create(activeCompanyId, selectedLeadId, {
        dueAt,
        note: followUpNote || undefined,
      });
    },
    onSuccess: () => {
      setShowFollowUpForm(false);
      setFollowUpDate('');
      setFollowUpTime('10:00');
      setFollowUpNote('');
      queryClient.invalidateQueries({ queryKey: ['lead', selectedLeadId] });
      queryClient.invalidateQueries({ queryKey: ['my-day'] });
      toast.success('📅 Seguimiento agendado');
    },
    onError: () => toast.error('Error al crear seguimiento'),
  });

  // Mutación para completar follow-up
  const completeFollowUpMutation = useMutation({
    mutationFn: async (followUpId: string) => {
      if (!activeCompanyId) return;
      return followUpsApi.complete(activeCompanyId, followUpId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', selectedLeadId] });
      queryClient.invalidateQueries({ queryKey: ['my-day'] });
      toast.success('✅ Seguimiento completado');
    },
    onError: () => toast.error('Error al completar'),
  });

  // Mutación para saltar follow-up
  const skipFollowUpMutation = useMutation({
    mutationFn: async (followUpId: string) => {
      if (!activeCompanyId) return;
      return followUpsApi.skip(activeCompanyId, followUpId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', selectedLeadId] });
      queryClient.invalidateQueries({ queryKey: ['my-day'] });
    },
  });

  function toggleTag(tagLabel: string) {
    if (!lead) return;
    const current = lead.tags || [];
    const newTags = current.includes(tagLabel)
      ? current.filter((t: string) => t !== tagLabel)
      : [...current, tagLabel];
    updateTagsMutation.mutate(newTags);
  }

  function addCustomTag() {
    if (!customTag.trim() || !lead) return;
    const current = lead.tags || [];
    if (!current.includes(customTag.trim())) {
      updateTagsMutation.mutate([...current, customTag.trim()]);
    }
    setCustomTag('');
    setShowTagInput(false);
  }

  function handleSubmitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    addNoteMutation.mutate();
  }

  function handleSubmitFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!followUpDate) {
      toast.error('Selecciona una fecha');
      return;
    }
    createFollowUpMutation.mutate();
  }

  if (!drawerOpen) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={closeLeadDrawer} />
      
      <div className="lead-drawer animate-slide-in-right">
        {/* Header */}
        <div className="lead-drawer__header">
          <div>
            <h2 className="lead-drawer__name">{lead?.fullName || 'Cargando...'}</h2>
            {lead?.stage && (
              <span
                className="lead-drawer__stage-badge"
                style={{ background: lead.stage.color + '20', color: lead.stage.color }}
              >
                {lead.stage.name}
              </span>
            )}
          </div>
          <button className="lead-drawer__close" onClick={closeLeadDrawer}>
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="lead-drawer__loading">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ height: 20, marginBottom: 8 }} />
            ))}
          </div>
        ) : lead ? (
          <div className="lead-drawer__content">

            {/* ── Información de contacto + WhatsApp ── */}
            <section className="lead-drawer__section">
              <h3 className="lead-drawer__section-title">Información de Contacto</h3>
              <div className="lead-drawer__info-grid">
                {lead.email && (
                  <div className="lead-drawer__info-item">
                    <Mail size={14} />
                    <a href={`mailto:${lead.email}`} className="lead-drawer__link">{lead.email}</a>
                  </div>
                )}
                {lead.phone && (
                  <div className="lead-drawer__info-item">
                    <Phone size={14} />
                    <a href={`tel:${lead.phone}`} className="lead-drawer__link">{lead.phone}</a>
                  </div>
                )}
                {lead.source && (
                  <div className="lead-drawer__info-item">
                    <Tag size={14} />
                    <span>Fuente: {lead.source}</span>
                  </div>
                )}
                {lead.nextFollowUpAt && (
                  <div className="lead-drawer__info-item">
                    <Calendar size={14} />
                    <span>
                      Próximo seguimiento:{' '}
                      {format(new Date(lead.nextFollowUpAt), "dd 'de' MMMM, yyyy", { locale: es })}
                    </span>
                  </div>
                )}
                <div className="lead-drawer__info-item lead-drawer__info-item--muted">
                  <Clock size={14} />
                  <span>Creado {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true, locale: es })}</span>
                </div>
              </div>

              {/* Botones de contacto rápido */}
              {lead.phone && (
                <div className="lead-drawer__contact-actions">
                  <a
                    href={buildWhatsAppUrl(lead.phone, lead.fullName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lead-drawer__contact-btn lead-drawer__contact-btn--wa"
                  >
                    <MessageCircle size={15} />
                    Escribir por WhatsApp
                  </a>
                  <a
                    href={`tel:${lead.phone}`}
                    className="lead-drawer__contact-btn lead-drawer__contact-btn--call"
                  >
                    <Phone size={15} />
                    Llamar
                  </a>
                </div>
              )}
            </section>

            {/* ── Tags interactivos ────────────────── */}
            <section className="lead-drawer__section">
              <h3 className="lead-drawer__section-title">
                <Tag size={13} /> Etiquetas
              </h3>
              <div className="lead-drawer__tags-grid">
                {PRESET_TAGS.map((preset) => {
                  const isActive = lead.tags?.includes(preset.label);
                  return (
                    <button
                      key={preset.label}
                      className={`lead-drawer__tag-btn ${isActive ? 'lead-drawer__tag-btn--active' : ''}`}
                      style={{
                        '--tag-color': preset.color,
                        background: isActive ? preset.color + '20' : undefined,
                        color: isActive ? preset.color : undefined,
                        borderColor: isActive ? preset.color + '40' : undefined,
                      } as React.CSSProperties}
                      onClick={() => toggleTag(preset.label)}
                    >
                      {preset.label}
                    </button>
                  );
                })}

                {/* Tags personalizados (no predefinidos) */}
                {lead.tags
                  ?.filter((t: string) => !PRESET_TAGS.some((p) => p.label === t))
                  .map((tag: string) => (
                    <button
                      key={tag}
                      className="lead-drawer__tag-btn lead-drawer__tag-btn--active lead-drawer__tag-btn--custom"
                      style={{
                        '--tag-color': getTagColor(tag),
                        background: getTagColor(tag) + '20',
                        color: getTagColor(tag),
                        borderColor: getTagColor(tag) + '40',
                      } as React.CSSProperties}
                      onClick={() => toggleTag(tag)}
                      title="Click para quitar"
                    >
                      {tag} ×
                    </button>
                  ))}

                {/* Agregar tag personalizado */}
                {showTagInput ? (
                  <div className="lead-drawer__tag-input-wrap">
                    <input
                      className="lead-drawer__tag-input"
                      placeholder="Nuevo tag..."
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
                      autoFocus
                    />
                    <button className="lead-drawer__tag-add" onClick={addCustomTag}>✓</button>
                    <button className="lead-drawer__tag-cancel" onClick={() => { setShowTagInput(false); setCustomTag(''); }}>×</button>
                  </div>
                ) : (
                  <button
                    className="lead-drawer__tag-btn lead-drawer__tag-btn--add"
                    onClick={() => setShowTagInput(true)}
                  >
                    <Plus size={12} /> Agregar
                  </button>
                )}
              </div>
            </section>

            {/* ── Seguimientos (Follow-ups) ─────────── */}
            <section className="lead-drawer__section">
              <h3 className="lead-drawer__section-title">
                <Calendar size={13} /> Seguimientos
                {lead.followUps && lead.followUps.filter((f: any) => f.status === 'PENDING').length > 0 && (
                  <span className="lead-drawer__followup-badge">
                    {lead.followUps.filter((f: any) => f.status === 'PENDING').length}
                  </span>
                )}
              </h3>

              {/* Botón para agendar nuevo */}
              {!showFollowUpForm ? (
                <button
                  className="lead-drawer__schedule-btn"
                  onClick={() => {
                    // Pre-fill con mañana
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setFollowUpDate(tomorrow.toISOString().split('T')[0]);
                    setShowFollowUpForm(true);
                  }}
                >
                  <CalendarPlus size={14} />
                  Agendar seguimiento
                </button>
              ) : (
                <form className="lead-drawer__followup-form" onSubmit={handleSubmitFollowUp}>
                  <div className="lead-drawer__followup-form-row">
                    <div className="lead-drawer__followup-field">
                      <label>📅 Fecha</label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="lead-drawer__followup-input"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="lead-drawer__followup-field">
                      <label>🕐 Hora</label>
                      <input
                        type="time"
                        value={followUpTime}
                        onChange={(e) => setFollowUpTime(e.target.value)}
                        className="lead-drawer__followup-input"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Nota rápida: ej. 'Enviar propuesta de inversión'"
                    value={followUpNote}
                    onChange={(e) => setFollowUpNote(e.target.value)}
                    className="lead-drawer__followup-input lead-drawer__followup-input--full"
                  />
                  <div className="lead-drawer__followup-form-actions">
                    <button
                      type="submit"
                      className="lead-drawer__followup-submit"
                      disabled={createFollowUpMutation.isPending}
                    >
                      <CalendarPlus size={13} />
                      {createFollowUpMutation.isPending ? 'Guardando...' : 'Agendar'}
                    </button>
                    <button
                      type="button"
                      className="lead-drawer__followup-cancel"
                      onClick={() => setShowFollowUpForm(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de follow-ups existentes */}
              {lead.followUps && lead.followUps.length > 0 ? (
                <div className="lead-drawer__followups-list">
                  {lead.followUps.map((fu: any) => {
                    const isPending = fu.status === 'PENDING';
                    const isOverdue = isPending && new Date(fu.dueAt) < new Date();
                    return (
                      <div
                        key={fu.id}
                        className={`lead-drawer__followup-item ${
                          !isPending ? 'lead-drawer__followup-item--done' : ''
                        } ${isOverdue ? 'lead-drawer__followup-item--overdue' : ''}`}
                      >
                        <div className="lead-drawer__followup-item-left">
                          <div className="lead-drawer__followup-item-status">
                            {isPending ? (
                              isOverdue ? <AlertTriangle size={13} /> : <Clock size={13} />
                            ) : (
                              <CheckCircle2 size={13} />
                            )}
                          </div>
                          <div>
                            <div className="lead-drawer__followup-item-date">
                              {format(new Date(fu.dueAt), "dd MMM yyyy 'a las' h:mm a", { locale: es })}
                            </div>
                            {fu.note && (
                              <div className="lead-drawer__followup-item-note">{fu.note}</div>
                            )}
                          </div>
                        </div>
                        {isPending && (
                          <div className="lead-drawer__followup-item-actions">
                            <button
                              className="lead-drawer__followup-complete-btn"
                              onClick={() => completeFollowUpMutation.mutate(fu.id)}
                              title="Marcar completado"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            <button
                              className="lead-drawer__followup-skip-btn"
                              onClick={() => skipFollowUpMutation.mutate(fu.id)}
                              title="Saltar"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : !showFollowUpForm ? (
                <p className="lead-drawer__empty">Sin seguimientos agendados</p>
              ) : null}
            </section>

            {/* ── Notas con input ──────────────────── */}
            <section className="lead-drawer__section">
              <h3 className="lead-drawer__section-title">Notas</h3>

              {/* Input */}
              <form className="lead-drawer__note-form" onSubmit={handleSubmitNote}>
                <textarea
                  className="lead-drawer__note-textarea"
                  placeholder="Escribe una nota... ej: 'Hablé con él, interesado en el plan premium'"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                />
                <button
                  type="submit"
                  className="lead-drawer__note-submit"
                  disabled={!noteText.trim() || addNoteMutation.isPending}
                >
                  <Send size={14} />
                  {addNoteMutation.isPending ? 'Guardando...' : 'Agregar nota'}
                </button>
              </form>

              {/* Lista de notas */}
              {lead.notes && lead.notes.length > 0 ? (
                <div className="lead-drawer__notes">
                  {lead.notes.map((note: any) => (
                    <div key={note.id} className="lead-drawer__note">
                      <div className="lead-drawer__note-header">
                        <span className="lead-drawer__note-author">
                          <User size={11} /> {note.author?.name || 'Sistema'}
                        </span>
                        <span className="lead-drawer__note-date">
                          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                      <p className="lead-drawer__note-body">{note.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="lead-drawer__empty">Sin notas aún — ¡agrega la primera!</p>
              )}
            </section>

            {/* ── Actividad ───────────────────────── */}
            <section className="lead-drawer__section">
              <h3 className="lead-drawer__section-title">Actividad Reciente</h3>
              {lead.activities && lead.activities.length > 0 ? (
                <div className="lead-drawer__activities">
                  {lead.activities.map((act: any) => (
                    <div key={act.id} className="lead-drawer__activity">
                      <div className="lead-drawer__activity-dot" />
                      <div>
                        <span className="lead-drawer__activity-type">
                          {translateActivityType(act.type)}
                        </span>
                        {act.metadata?.from && act.metadata?.to && (
                          <span className="lead-drawer__activity-detail">
                            {' '}{act.metadata.from} → {act.metadata.to}
                          </span>
                        )}
                        <span className="lead-drawer__activity-time">
                          {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="lead-drawer__empty">Sin actividad registrada</p>
              )}
            </section>

            {/* ── Secuencias de seguimiento ─────── */}
            <section className="lead-drawer__section">
              <h3 className="lead-drawer__section-title">
                <Zap size={13} /> Secuencias de Seguimiento
              </h3>
              {activeCompanyId && (
                <LeadSequences
                  companyId={activeCompanyId}
                  leadId={lead.id}
                  leadEmail={lead.email}
                />
              )}
            </section>
          </div>
        ) : null}
      </div>
    </>
  );
}

function translateActivityType(type: string): string {
  const map: Record<string, string> = {
    CREATED: '✨ Lead creado',
    STAGE_CHANGED: '📋 Etapa cambiada',
    NOTE_ADDED: '📝 Nota agregada',
    FOLLOWUP_CREATED: '📅 Seguimiento creado',
    FOLLOWUP_COMPLETED: '✅ Seguimiento completado',
    ASSIGNED: '👤 Asignado',
    REASSIGNED: '🔄 Reasignado',
    SYNCED_FROM_SHEET: '📊 Sincronizado desde hoja',
    FIELD_UPDATED: '✏️ Campo actualizado',
    SEQUENCE_ENROLLED: '⚡ Inscrito en secuencia',
    SEQUENCE_EMAIL_SENT: '📧 Email de secuencia enviado',
    SEQUENCE_COMPLETED: '🏁 Secuencia completada',
    SEQUENCE_PAUSED: '⏸️ Secuencia pausada',
    SEQUENCE_CANCELLED: '❌ Secuencia cancelada',
  };
  return map[type] || type;
}

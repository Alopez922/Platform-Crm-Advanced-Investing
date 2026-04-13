import { useDraggable } from '@dnd-kit/core';
import { Mail, Phone, Calendar, User, Archive, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Lead } from '../../api';
import { useArchiveLead } from '../../hooks/useQueries';
import { useAppStore } from '../../stores/appStore';
import toast from 'react-hot-toast';
import './LeadCard.css';

// Colores de tags predefinidos — sincronizados con LeadDetailDrawer
const TAG_COLORS: Record<string, string> = {
  'Contactado': '#3B82F6',
  'No contesta': '#EF4444',
  'Interesado': '#10B981',
  'Llamar luego': '#F59E0B',
  'Calificado': '#8B5CF6',
  'Reunión agendada': '#EC4899',
  'Propuesta enviada': '#06B6D4',
  'Sin interés': '#6B7280',
};

function getTagColor(tag: string): string {
  if (TAG_COLORS[tag]) return TAG_COLORS[tag];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash % 360)}, 60%, 55%)`;
}

// Semáforo: calcular cuántos días sin actualización
function getUrgencyLevel(updatedAt: string): 'fresh' | 'warm' | 'stale' {
  const diff = Date.now() - new Date(updatedAt).getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days <= 1) return 'fresh';   // Verde: ≤ 24 hrs
  if (days <= 3) return 'warm';    // Amarillo: 1-3 días 
  return 'stale';                  // Rojo: +3 días
}

function getUrgencyTooltip(updatedAt: string): string {
  const diff = Date.now() - new Date(updatedAt).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Actualizado hoy';
  if (days === 1) return 'Actualizado ayer';
  return `${days} días sin actividad`;
}

function buildWhatsAppUrl(phone: string, name: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, '');
  const msg = encodeURIComponent(`Hola ${name}, soy de Advanced Investing. ¿Cómo estás?`);
  return `https://wa.me/${cleaned}?text=${msg}`;
}

interface Props {
  lead: Lead;
  isOverlay?: boolean;
  onClick: () => void;
}

export default function LeadCard({ lead, isOverlay = false, onClick }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
  });

  const { activeCompanyId } = useAppStore();
  const archiveMutation = useArchiveLead();
  const assignedUser = lead.assignments?.[0]?.user;
  const urgency = getUrgencyLevel(lead.updatedAt);

  function handleArchive(e: React.MouseEvent) {
    e.stopPropagation();
    if (!activeCompanyId) return;
    if (!confirm(`¿Archivar a ${lead.fullName}?`)) return;

    archiveMutation.mutate(
      { companyId: activeCompanyId, leadId: lead.id },
      {
        onSuccess: () => toast.success(`${lead.fullName} archivado`),
        onError: () => toast.error('Error al archivar'),
      }
    );
  }

  function handleWhatsApp(e: React.MouseEvent) {
    e.stopPropagation();
    if (lead.phone) {
      window.open(buildWhatsAppUrl(lead.phone, lead.fullName), '_blank');
    }
  }

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      {...(!isOverlay ? { ...listeners, ...attributes } : {})}
      className={`lead-card ${isDragging ? 'lead-card--dragging' : ''} ${
        isOverlay ? 'lead-card--overlay' : ''
      } ${urgency === 'stale' ? 'lead-card--stale' : ''}`}
      onClick={() => { if (!isDragging) onClick(); }}
    >
      {/* Semáforo de urgencia */}
      <div
        className={`lead-card__urgency lead-card__urgency--${urgency}`}
        title={getUrgencyTooltip(lead.updatedAt)}
      />

      {/* Botones de acción rápida (hover) */}
      {!isOverlay && (
        <div className="lead-card__quick-actions">
          {lead.phone && (
            <button
              className="lead-card__quick-btn lead-card__quick-btn--wa"
              onClick={handleWhatsApp}
              title="WhatsApp"
            >
              <MessageCircle size={12} />
            </button>
          )}
          <button
            className="lead-card__quick-btn lead-card__quick-btn--archive"
            onClick={handleArchive}
            title="Archivar lead"
          >
            <Archive size={12} />
          </button>
        </div>
      )}

      {/* Nombre */}
      <div className="lead-card__name">{lead.fullName}</div>

      {/* Info de contacto */}
      <div className="lead-card__details">
        {lead.email && (
          <div className="lead-card__detail">
            <Mail size={12} />
            <span>{lead.email}</span>
          </div>
        )}
        {lead.phone && (
          <div className="lead-card__detail">
            <Phone size={12} />
            <span>{lead.phone}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {((lead.tags && lead.tags.length > 0) || lead.source) && (
        <div className="lead-card__tags">
          {lead.source && (
            <span className="lead-card__source">{lead.source}</span>
          )}
          {lead.tags?.slice(0, 3).map((tag) => {
            const color = getTagColor(tag);
            return (
              <span
                key={tag}
                className="lead-card__tag"
                style={{
                  background: color + '18',
                  color: color,
                  borderColor: color + '30',
                }}
              >
                {tag}
              </span>
            );
          })}
          {(lead.tags?.length || 0) > 3 && (
            <span className="lead-card__tag lead-card__tag--more">
              +{(lead.tags?.length || 0) - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="lead-card__footer">
        <div className="lead-card__bottom">
          {lead.nextFollowUpAt && (
            <div className="lead-card__followup">
              <Calendar size={11} />
              <span>
                {format(new Date(lead.nextFollowUpAt), 'dd MMM', { locale: es })}
              </span>
            </div>
          )}
          {assignedUser && (
            <div className="lead-card__owner" title={assignedUser.name}>
              <User size={11} />
              <span>{assignedUser.name.split(' ')[0]}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

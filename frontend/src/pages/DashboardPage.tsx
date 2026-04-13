import { useNavigate } from 'react-router-dom';
import { useMyDay, useCompanies, useCompleteFollowUp, useMarkContacted } from '../hooks/useQueries';
import {
  Sun, Moon, Sunrise,
  CheckCircle2, Clock, Users, TrendingUp,
  Phone, MessageCircle, ChevronRight, AlertTriangle,
  Building2, Sparkles, CalendarCheck, Info,
  Rocket, UserPlus, ArrowRight,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import './DashboardPage.css';

function getGreeting(): { text: string; icon: React.ReactNode; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Buenos días', icon: <Sunrise size={28} />, emoji: '☀️' };
  if (hour < 19) return { text: 'Buenas tardes', icon: <Sun size={28} />, emoji: '🌤️' };
  return { text: 'Buenas noches', icon: <Moon size={28} />, emoji: '🌙' };
}

function buildWhatsAppUrl(phone: string, name: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, '');
  const msg = encodeURIComponent(`Hola ${name}, soy de Advanced Investing. ¿Cómo estás?`);
  return `https://wa.me/${cleaned}?text=${msg}`;
}

export default function DashboardPage() {
  const { data: myDay, isLoading } = useMyDay();
  const { data: companies } = useCompanies();
  const navigate = useNavigate();
  const completeMutation = useCompleteFollowUp();
  const contactedMutation = useMarkContacted();
  const greeting = getGreeting();

  function handleComplete(followUp: any) {
    completeMutation.mutate(
      { companyId: followUp.lead.companyId, followUpId: followUp.id },
      {
        onSuccess: () => toast.success(`✅ Seguimiento de ${followUp.lead.fullName} completado`),
        onError: () => toast.error('Error al completar'),
      }
    );
  }

  function navigateToLead(companySlug: string) {
    navigate(`/empresa/${companySlug}`);
  }

  function handleMarkContacted(e: React.MouseEvent, lead: any) {
    e.stopPropagation();
    contactedMutation.mutate(lead.id, {
      onSuccess: () => toast.success(`✅ ${lead.fullName} marcado como contactado`),
      onError: () => toast.error('Error al marcar como contactado'),
    });
  }

  function getDaysSinceActivity(lead: any): number {
    const lastActivity = lead.activities?.[0]?.createdAt || lead.updatedAt;
    const diff = Date.now() - new Date(lastActivity).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  const todayStr = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  // Stats data
  const stats = [
    {
      key: 'pending',
      icon: <Clock size={22} />,
      bgIcon: <Clock size={48} />,
      value: myDay?.stats.pendingFollowUps ?? 0,
      label: 'Seguimientos Pendientes',
      description: 'Llamadas o mensajes que debes hacer hoy',
      className: 'dashboard__stat--pending',
    },
    {
      key: 'today',
      icon: <UserPlus size={22} />,
      bgIcon: <UserPlus size={48} />,
      value: myDay?.stats.newLeadsToday ?? 0,
      label: 'Leads Nuevos Hoy',
      description: 'Personas que entraron hoy al sistema',
      className: 'dashboard__stat--today',
    },
    {
      key: 'week',
      icon: <Users size={22} />,
      bgIcon: <Users size={48} />,
      value: myDay?.stats.newLeadsThisWeek ?? 0,
      label: 'Leads Esta Semana',
      description: 'Total de personas nuevas esta semana',
      className: 'dashboard__stat--week',
    },
    {
      key: 'done',
      icon: <CalendarCheck size={22} />,
      bgIcon: <CalendarCheck size={48} />,
      value: myDay?.stats.completedThisWeek ?? 0,
      label: 'Completados',
      description: 'Seguimientos que ya cerraste esta semana',
      className: 'dashboard__stat--done',
    },
  ];

  return (
    <div className="dashboard">
      {/* ── Header con saludo ─────────────── */}
      <div className="dashboard__header" style={{ animationDelay: '0ms' }}>
        <div className="dashboard__greeting">
          <span className="dashboard__greeting-icon">{greeting.icon}</span>
          <div>
            <h1 className="dashboard__title">{greeting.text} {greeting.emoji}</h1>
            <p className="dashboard__subtitle">
              {todayStr.charAt(0).toUpperCase() + todayStr.slice(1)}
            </p>
          </div>
        </div>
        <p className="dashboard__header-hint">
          <Info size={14} />
          Este es tu centro de control diario. Aquí ves todo lo importante de un vistazo.
        </p>
      </div>

      {/* ── Stats Cards ──────────────────── */}
      <div className="dashboard__stats">
        {stats.map((stat, i) => (
          <div
            key={stat.key}
            className={`dashboard__stat ${stat.className}`}
            style={{ animationDelay: `${(i + 1) * 80}ms` }}
          >
            <div className="dashboard__stat-bg-icon">{stat.bgIcon}</div>
            <div className="dashboard__stat-icon-wrap">{stat.icon}</div>
            <div className="dashboard__stat-content">
              <div className="dashboard__stat-value">
                {isLoading ? '...' : stat.value}
              </div>
              <div className="dashboard__stat-label">{stat.label}</div>
              <div className="dashboard__stat-desc">{stat.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Sección: Seguimientos de Hoy ──── */}
      <section className="dashboard__section" style={{ animationDelay: '400ms' }}>
        <div className="dashboard__section-header">
          <h2 className="dashboard__section-title">
            <Clock size={18} />
            Seguimientos de Hoy
            {myDay?.todayFollowUps?.length > 0 && (
              <span className="dashboard__section-badge">{myDay.todayFollowUps.length}</span>
            )}
          </h2>
          <p className="dashboard__section-desc">
            Llamadas y mensajes que programaste para hoy. Márcalos cuando termines ✓
          </p>
        </div>

        {isLoading ? (
          <div className="dashboard__skeleton-list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton dashboard__skeleton-card" />
            ))}
          </div>
        ) : myDay?.todayFollowUps?.length > 0 ? (
          <div className="dashboard__followup-list">
            {myDay.todayFollowUps.map((fu: any) => (
              <div
                key={fu.id}
                className={`dashboard__followup-card ${fu.isOverdue ? 'dashboard__followup-card--overdue' : ''}`}
              >
                <div className="dashboard__followup-left">
                  <div className="dashboard__followup-name">{fu.lead.fullName}</div>
                  <div className="dashboard__followup-meta">
                    <span
                      className="dashboard__followup-company"
                      style={{ color: fu.lead.company?.color }}
                    >
                      {fu.lead.company?.name}
                    </span>
                    <span className="dashboard__followup-stage" style={{
                      background: fu.lead.stage?.color + '20',
                      color: fu.lead.stage?.color
                    }}>
                      {fu.lead.stage?.name}
                    </span>
                  </div>
                  {fu.note && (
                    <div className="dashboard__followup-note">📝 {fu.note}</div>
                  )}
                  <div className="dashboard__followup-time">
                    {fu.isOverdue ? (
                      <span className="dashboard__overdue-badge">
                        <AlertTriangle size={11} />
                        Vencido — {formatDistanceToNow(new Date(fu.dueAt), { locale: es })}
                      </span>
                    ) : (
                      <span>🕐 {format(new Date(fu.dueAt), 'h:mm a')}</span>
                    )}
                  </div>
                </div>

                <div className="dashboard__followup-actions">
                  {fu.lead.phone && (
                    <>
                      <a
                        href={buildWhatsAppUrl(fu.lead.phone, fu.lead.fullName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="dashboard__action-btn dashboard__action-btn--whatsapp"
                        title="Enviar WhatsApp"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle size={15} />
                      </a>
                      <a
                        href={`tel:${fu.lead.phone}`}
                        className="dashboard__action-btn dashboard__action-btn--call"
                        title="Llamar por teléfono"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone size={15} />
                      </a>
                    </>
                  )}
                  <button
                    className="dashboard__action-btn dashboard__action-btn--done"
                    title="Marcar como completado"
                    onClick={() => handleComplete(fu)}
                    disabled={completeMutation.isPending}
                  >
                    <CheckCircle2 size={15} />
                  </button>
                  <button
                    className="dashboard__action-btn dashboard__action-btn--go"
                    title="Ver detalle del lead"
                    onClick={() => navigateToLead(fu.lead.company?.slug)}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard__empty">
            <CheckCircle2 size={36} className="dashboard__empty-icon dashboard__empty-icon--success" />
            <p className="dashboard__empty-title">¡Todo al día!</p>
            <p className="dashboard__empty-hint">
              No tienes seguimientos pendientes para hoy. Cuando programes uno desde un lead, aparecerá aquí.
            </p>
          </div>
        )}
      </section>

      {/* ── Sección: Sin Contactar ────────── */}
      <section className="dashboard__section" style={{ animationDelay: '500ms' }}>
        <div className="dashboard__section-header">
          <h2 className="dashboard__section-title">
            <Sparkles size={18} />
            Nuevos sin Contactar
            {myDay?.uncontactedLeads?.length > 0 && (
              <span className="dashboard__section-badge dashboard__section-badge--purple">
                {myDay.uncontactedLeads.length}
              </span>
            )}
          </h2>
          <p className="dashboard__section-desc">
            Estos leads acaban de llegar y aún no los has contactado. ¡Escríbeles cuanto antes para no perderlos!
          </p>
        </div>

        {isLoading ? (
          <div className="dashboard__skeleton-list">
            {[1, 2].map((i) => (
              <div key={i} className="skeleton dashboard__skeleton-card" />
            ))}
          </div>
        ) : myDay?.uncontactedLeads?.length > 0 ? (
          <div className="dashboard__lead-grid">
            {myDay.uncontactedLeads.map((lead: any, idx: number) => (
              <div
                key={lead.id}
                className="dashboard__lead-card dashboard__lead-card--new"
                onClick={() => navigateToLead(lead.company?.slug)}
                style={{ animationDelay: `${600 + idx * 60}ms` }}
              >
                <div className="dashboard__lead-top">
                  <div className="dashboard__lead-avatar">
                    {lead.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="dashboard__lead-main">
                    <span className="dashboard__lead-name">{lead.fullName}</span>
                    <span className="dashboard__lead-time">
                      {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                </div>
                <div className="dashboard__lead-info">
                  <span
                    className="dashboard__lead-company"
                    style={{ color: lead.company?.color }}
                  >
                    <Building2 size={11} /> {lead.company?.name}
                  </span>
                  {lead.phone && (
                    <a
                      href={buildWhatsAppUrl(lead.phone, lead.fullName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dashboard__lead-wa"
                      onClick={(e) => e.stopPropagation()}
                      title="Escribir por WhatsApp"
                    >
                      <MessageCircle size={12} /> WhatsApp
                    </a>
                  )}
                </div>
                <button
                  className="dashboard__lead-contacted-btn"
                  onClick={(e) => handleMarkContacted(e, lead)}
                  disabled={contactedMutation.isPending}
                  title="Marcar como ya contactado"
                >
                  <CheckCircle2 size={13} /> Ya lo contacté
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard__empty">
            <Rocket size={36} className="dashboard__empty-icon dashboard__empty-icon--purple" />
            <p className="dashboard__empty-title">Todos contactados</p>
            <p className="dashboard__empty-hint">
              No hay leads nuevos pendientes de contacto. Cuando lleguen desde Google Sheets o manualmente, aparecerán aquí.
            </p>
          </div>
        )}
      </section>

      {/* ── Sección: Necesitan Atención ───── */}
      <section className="dashboard__section" style={{ animationDelay: '600ms' }}>
        <div className="dashboard__section-header">
          <h2 className="dashboard__section-title">
            <AlertTriangle size={18} />
            Necesitan Atención
            {myDay?.staleLeads?.length > 0 && (
              <span className="dashboard__section-badge dashboard__section-badge--red">
                {myDay.staleLeads.length}
              </span>
            )}
          </h2>
          <p className="dashboard__section-desc">
            Leads que llevan más de 3 días sin actividad. Revísalos para que no se enfríen — un lead sin atención es un lead perdido.
          </p>
        </div>

        {isLoading ? (
          <div className="dashboard__skeleton-list">
            {[1, 2].map((i) => (
              <div key={i} className="skeleton dashboard__skeleton-card" />
            ))}
          </div>
        ) : myDay?.staleLeads?.length > 0 ? (
          <div className="dashboard__lead-grid">
            {myDay.staleLeads.map((lead: any) => {
              const days = getDaysSinceActivity(lead);
              return (
                <div
                  key={lead.id}
                  className="dashboard__lead-card dashboard__lead-card--stale"
                  onClick={() => navigateToLead(lead.company?.slug)}
                >
                  <div className="dashboard__lead-top">
                    <div className="dashboard__lead-avatar dashboard__lead-avatar--stale">
                      {lead.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="dashboard__lead-main">
                      <span className="dashboard__lead-name">{lead.fullName}</span>
                      <span className="dashboard__stale-badge">
                        🔴 {days} días sin actividad
                      </span>
                    </div>
                  </div>
                  <div className="dashboard__lead-info">
                    <span
                      className="dashboard__lead-company"
                      style={{ color: lead.company?.color }}
                    >
                      <Building2 size={11} /> {lead.company?.name}
                    </span>
                    <span className="dashboard__lead-stage" style={{
                      background: lead.stage?.color + '20',
                      color: lead.stage?.color
                    }}>
                      {lead.stage?.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="dashboard__empty">
            <TrendingUp size={36} className="dashboard__empty-icon dashboard__empty-icon--green" />
            <p className="dashboard__empty-title">Todo activo</p>
            <p className="dashboard__empty-hint">
              Todos tus leads tienen actividad reciente. ¡Buen trabajo manteniéndolos al día!
            </p>
          </div>
        )}
      </section>

      {/* ── Empresas ────────────────────────── */}
      {companies && companies.length > 0 && (
        <section className="dashboard__section" style={{ animationDelay: '700ms' }}>
          <div className="dashboard__section-header">
            <h2 className="dashboard__section-title">
              <Building2 size={18} />
              Tus Empresas
            </h2>
            <p className="dashboard__section-desc">
              Haz clic en una empresa para ir a su tablero Kanban y gestionar sus leads.
            </p>
          </div>
          <div className="dashboard__companies-mini">
            {companies.map((company) => (
              <button
                key={company.id}
                className="dashboard__company-pill"
                style={{ '--accent': company.color } as React.CSSProperties}
                onClick={() => navigate(`/empresa/${company.slug}`)}
              >
                <div className="dashboard__company-pill-dot" style={{ background: company.color }} />
                <div className="dashboard__company-pill-info">
                  <span className="dashboard__company-pill-name">{company.name}</span>
                  <span className="dashboard__company-pill-meta">
                    {company._count?.leads || 0} leads
                  </span>
                </div>
                <ArrowRight size={14} className="dashboard__company-pill-arrow" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

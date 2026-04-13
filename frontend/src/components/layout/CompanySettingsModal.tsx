import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { X, Sheet, Trash2, RefreshCw, CheckCircle, AlertTriangle, Link2, Columns3, Plus, LogIn, Phone, RotateCcw, Trophy, XCircle, Layers, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { api } from '../../api/client';
import { stagesApi, sheetsTabsApi } from '../../api';
import { useAppStore } from '../../stores/appStore';
import toast from 'react-hot-toast';
import './CompanySettingsModal.css';

interface Props {
  company: {
    id: string;
    name: string;
    slug: string;
    color: string;
    sheetConnection?: any;
  };
  onClose: () => void;
}

type Tab = 'sheets' | 'stages' | 'danger';

const ROLE_OPTIONS = [
  { value: 'ENTRY', label: 'Entrada', icon: LogIn, color: '#3B82F6', desc: 'Leads nuevos caen aquí' },
  { value: 'CONTACTED', label: 'Contactado', icon: Phone, color: '#F59E0B', desc: 'Ya fue contactado' },
  { value: 'FOLLOW_UP', label: 'Seguimiento', icon: RotateCcw, color: '#8B5CF6', desc: 'En proceso' },
  { value: 'WON', label: 'Ganado', icon: Trophy, color: '#10B981', desc: 'Cerrado positivo' },
  { value: 'LOST', label: 'Perdido', icon: XCircle, color: '#EF4444', desc: 'Lead descartado' },
  { value: 'DEFAULT', label: 'Sin rol', icon: Layers, color: '#6B7280', desc: 'Sin comportamiento' },
];

const COLOR_PALETTE = [
  '#3B82F6', '#2563EB', '#8B5CF6', '#A855F7',
  '#EC4899', '#10B981', '#F59E0B', '#EF4444',
  '#06B6D4', '#14B8A6', '#F97316', '#6B7280',
];

export default function CompanySettingsModal({ company, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('sheets');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [deleteInput, setDeleteInput] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [editedStages, setEditedStages] = useState<any[] | null>(null);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#6B7280');
  const [newStageRole, setNewStageRole] = useState('DEFAULT');
  const [detectedTabs, setDetectedTabs] = useState<any[] | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { } = useAppStore();

  // Estado de conexión actual
  const { data: connection, refetch: refetchConn } = useQuery({
    queryKey: ['sheet-connection', company.id],
    queryFn: async () => {
      const res = await api.get(`/companies/${company.id}/sheets`) as any;
      return res.data;
    },
  });

  // Etapas de la empresa
  const { data: stages, refetch: refetchStages } = useQuery({
    queryKey: ['stages', company.id],
    queryFn: async () => {
      const res = await stagesApi.getByCompany(company.id);
      return res.data;
    },
  });

  // Inicializar editedStages cuando se cargan
  if (stages && !editedStages) {
    setEditedStages(stages.map((s: any) => ({ ...s })));
  }

  // Conectar sheet
  const connectMutation = useMutation({
    mutationFn: async () =>
      api.post(`/companies/${company.id}/sheets/connect`, { spreadsheetId, sheetName }),
    onSuccess: () => {
      toast.success('¡Hoja conectada exitosamente!');
      refetchConn();
      setSpreadsheetId('');
    },
    onError: () => toast.error('Error al conectar la hoja'),
  });

  // Sincronizar
  const syncMutation = useMutation({
    mutationFn: async () => api.post(`/companies/${company.id}/sheets/sync`),
    onSuccess: (res: any) => {
      toast.success(res.data?.message || 'Sincronización completada');
      queryClient.invalidateQueries({ queryKey: ['board', company.id] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      refetchConn();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al sincronizar'),
  });

  // Eliminar empresa
  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/companies/${company.id}`),
    onSuccess: () => {
      toast.success(`Empresa "${company.name}" eliminada`);
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      onClose();
      navigate('/');
    },
    onError: () => toast.error('Error al eliminar la empresa'),
  });

  // Guardar etapas
  const saveStagesMutation = useMutation({
    mutationFn: async () => {
      if (!editedStages) return;
      return stagesApi.updateAll(company.id, editedStages.map((s, i) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        role: s.role,
        position: i,
      })));
    },
    onSuccess: () => {
      toast.success('✅ Etapas guardadas correctamente');
      refetchStages();
      queryClient.invalidateQueries({ queryKey: ['board', company.id] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['my-day'] });
      setEditedStages(null); // Force reload from server
    },
    onError: () => toast.error('Error al guardar etapas'),
  });

  // Agregar etapa
  const addStageMutation = useMutation({
    mutationFn: async () => {
      if (!newStageName.trim()) throw new Error('Nombre requerido');
      return stagesApi.add(company.id, { name: newStageName, color: newStageColor, role: newStageRole });
    },
    onSuccess: () => {
      toast.success('Etapa creada');
      setNewStageName('');
      setNewStageColor('#6B7280');
      setNewStageRole('DEFAULT');
      setEditedStages(null);
      refetchStages();
      queryClient.invalidateQueries({ queryKey: ['board', company.id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Error al crear etapa'),
  });

  // Eliminar etapa
  const deleteStageMutation = useMutation({
    mutationFn: async (stageId: string) => stagesApi.remove(company.id, stageId),
    onSuccess: () => {
      toast.success('Etapa eliminada');
      setEditedStages(null);
      refetchStages();
      queryClient.invalidateQueries({ queryKey: ['board', company.id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Error al eliminar'),
  });

  async function handleTest() {
    if (!spreadsheetId) return toast.error('Ingresa el ID de la hoja');
    setIsTesting(true);
    setTestResult(null);
    try {
      await api.post(`/companies/${company.id}/sheets/connect`, { spreadsheetId, sheetName });
      const res = await api.post(`/companies/${company.id}/sheets/test`) as any;
      setTestResult(res.data);
      toast.success('Conexión exitosa');
    } catch (e: any) {
      setTestResult({ ok: false, error: e?.response?.data?.message || 'No se pudo conectar' });
      toast.error('Error de conexión');
    } finally {
      setIsTesting(false);
    }
  }

  function extractIdFromUrl(value: string) {
    const match = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : value;
  }

  function updateStageField(idx: number, field: string, value: any) {
    if (!editedStages) return;
    const updated = [...editedStages];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditedStages(updated);
  }

  function moveStage(idx: number, dir: 'up' | 'down') {
    if (!editedStages) return;
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= editedStages.length) return;
    const updated = [...editedStages];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setEditedStages(updated);
  }

  const hasChanges = editedStages && stages && JSON.stringify(
    editedStages.map((s: any, i: number) => ({ id: s.id, name: s.name, color: s.color, role: s.role, position: i }))
  ) !== JSON.stringify(
    stages.map((s: any) => ({ id: s.id, name: s.name, color: s.color, role: s.role, position: s.position }))
  );

  const canDelete = deleteInput === company.name;

  return (
    <div className="csm-overlay" onClick={onClose}>
      <div className="csm" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="csm__header" style={{ borderColor: company.color + '40' }}>
          <div className="csm__header-left">
            <div className="csm__dot" style={{ background: company.color }} />
            <div>
              <div className="csm__title">Configuración</div>
              <div className="csm__subtitle">{company.name}</div>
            </div>
          </div>
          <button className="csm__close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="csm__tabs">
          <button className={`csm__tab ${tab === 'sheets' ? 'csm__tab--active' : ''}`} onClick={() => setTab('sheets')}>
            <Sheet size={14} /> Google Sheets
          </button>
          <button className={`csm__tab ${tab === 'stages' ? 'csm__tab--active' : ''}`} onClick={() => setTab('stages')}>
            <Columns3 size={14} /> Etapas
          </button>
          <button className={`csm__tab csm__tab--danger-tab ${tab === 'danger' ? 'csm__tab--active csm__tab--danger-active' : ''}`} onClick={() => setTab('danger')}>
            <Trash2 size={14} /> Zona de Peligro
          </button>
        </div>

        {/* Contenido */}
        <div className="csm__body">

          {/* ── TAB: GOOGLE SHEETS ─────────────── */}
          {tab === 'sheets' && (
            <div className="csm__section">

              {/* Conexión actual */}
              {connection && (
                <>
                  <div className={`csm__current ${connection.syncStatus === 'SUCCESS' ? 'csm__current--ok' : connection.syncStatus === 'ERROR' ? 'csm__current--error' : ''}`}>
                    <div className="csm__current-icon">
                      {connection.syncStatus === 'SUCCESS' ? <CheckCircle size={16} /> : <Link2 size={16} />}
                    </div>
                    <div className="csm__current-info">
                      <div className="csm__current-id">{connection.spreadsheetId}</div>
                      <div className="csm__current-meta">
                        Hoja: <strong>{connection.sheetName}</strong>
                        {connection.lastSyncAt && ` · Último sync: ${new Date(connection.lastSyncAt).toLocaleString('es')}`}
                      </div>
                    </div>
                    <button
                      className="csm__sync-btn"
                      onClick={() => syncMutation.mutate()}
                      disabled={syncMutation.isPending}
                    >
                      <RefreshCw size={14} className={syncMutation.isPending ? 'spinning' : ''} />
                      {syncMutation.isPending ? 'Sincronizando...' : 'Sincronizar ahora'}
                    </button>
                  </div>

                  {/* Auto-sync toggle */}
                  <div className="csm__autosync">
                    <div className="csm__autosync-info">
                      <div className="csm__autosync-title">Sincronización automática</div>
                      <div className="csm__autosync-desc">
                        {connection.autoSyncEnabled
                          ? `✅ Activa · revisa cada ${connection.autoSyncIntervalMinutes || 30} min`
                          : '⏸ Desactivada · los leads no se importan solos'}
                      </div>
                    </div>
                    <div className="csm__autosync-controls">
                      <select
                        className="csm__input csm__select-sm"
                        defaultValue={connection.autoSyncIntervalMinutes || 30}
                        onChange={(e) => {
                          api.patch(`/companies/${company.id}/sheets/autosync`, {
                            enabled: connection.autoSyncEnabled,
                            intervalMinutes: parseInt(e.target.value),
                          }).then(() => refetchConn());
                        }}
                      >
                        <option value={5}>Cada 5 min</option>
                        <option value={15}>Cada 15 min</option>
                        <option value={30}>Cada 30 min</option>
                        <option value={60}>Cada hora</option>
                      </select>
                      <button
                        className={`csm__toggle-btn ${connection.autoSyncEnabled ? 'csm__toggle-btn--on' : ''}`}
                        onClick={() => {
                          api.patch(`/companies/${company.id}/sheets/autosync`, {
                            enabled: !connection.autoSyncEnabled,
                          }).then(() => refetchConn());
                        }}
                      >
                        {connection.autoSyncEnabled ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Formulario nueva conexión */}
              <div className="csm__field">
                <label className="csm__label">ID o URL del Google Sheet</label>
                <input
                  className="csm__input"
                  placeholder="https://docs.google.com/spreadsheets/d/XXXXX/edit  o solo el ID"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(extractIdFromUrl(e.target.value))}
                />
                <span className="csm__hint">
                  Puedes pegar la URL completa o solo el ID. Asegúrate de haber compartido la hoja con:<br />
                  <code>leadpilot-sheets@advanced-investing-bots-app.iam.gserviceaccount.com</code>
                </span>
              </div>

              <div className="csm__field">
                <label className="csm__label">Nombre de la pestaña</label>
                <input
                  className="csm__input"
                  placeholder="Sheet1"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                />
              </div>

              {/* Resultado del test */}
              {testResult && (
                <div className={`csm__test-result ${testResult.ok ? 'csm__test-result--ok' : 'csm__test-result--error'}`}>
                  {testResult.ok ? (
                    <>
                      <CheckCircle size={14} />
                      <span>Conexión exitosa · {testResult.rowCount} filas · Columnas: {testResult.headers?.join(', ')}</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={14} />
                      <span>{testResult.error}</span>
                    </>
                  )}
                </div>
              )}

              <div className="csm__actions">
                <button className="csm__btn csm__btn--secondary" onClick={handleTest} disabled={isTesting || !spreadsheetId}>
                  {isTesting ? <RefreshCw size={14} className="spinning" /> : <CheckCircle size={14} />}
                  Probar conexión
                </button>
                <button className="csm__btn csm__btn--primary" onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending || !spreadsheetId}>
                  <Sheet size={14} />
                  {connectMutation.isPending ? 'Conectando...' : 'Conectar y guardar'}
                </button>
              </div>

              {/* ── PESTAÑAS DEL SHEET ──────────── */}
              {connection && (
                <div className="csm__tabs-section">
                  <div className="csm__tabs-section-header">
                    <div>
                      <div className="csm__tabs-section-title">📑 Pestañas del Google Sheet</div>
                      <div className="csm__tabs-section-desc">
                        Detecta las pestañas de tu Sheet y elige cuáles quieres sincronizar. Cada pestaña puede tener su propia fuente.
                      </div>
                    </div>
                    <button
                      className="csm__btn csm__btn--secondary csm__btn--sm"
                      onClick={async () => {
                        setIsDetecting(true);
                        try {
                          const res = await sheetsTabsApi.detect(company.id);
                          setDetectedTabs(res.data.tabs);
                          toast.success(`Se detectaron ${res.data.tabs.length} pestañas`);
                        } catch (e: any) {
                          toast.error(e?.response?.data?.error || 'Error al detectar pestañas');
                        } finally {
                          setIsDetecting(false);
                        }
                      }}
                      disabled={isDetecting}
                    >
                      {isDetecting ? <RefreshCw size={13} className="spinning" /> : <Search size={13} />}
                      {isDetecting ? 'Detectando...' : 'Detectar pestañas'}
                    </button>
                  </div>

                  {detectedTabs && detectedTabs.length > 0 && (
                    <>
                      <div className="csm__tabs-list">
                        {detectedTabs.map((dt: any, idx: number) => (
                          <div key={dt.name} className={`csm__tab-item ${dt.enabled ? 'csm__tab-item--enabled' : ''}`}>
                            <button
                              className="csm__tab-toggle"
                              onClick={() => {
                                const updated = [...detectedTabs];
                                updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
                                setDetectedTabs(updated);
                              }}
                            >
                              {dt.enabled
                                ? <ToggleRight size={22} style={{ color: '#10B981' }} />
                                : <ToggleLeft size={22} style={{ color: '#6B7280' }} />
                              }
                            </button>
                            <div className="csm__tab-name">{dt.name}</div>
                            <div className="csm__tab-arrow">→</div>
                            <div className="csm__tab-source-field">
                              <label className="csm__tab-source-label">Fuente:</label>
                              <input
                                className="csm__tab-source-input"
                                value={dt.sourceLabel}
                                onChange={(e) => {
                                  const updated = [...detectedTabs];
                                  updated[idx] = { ...updated[idx], sourceLabel: e.target.value };
                                  setDetectedTabs(updated);
                                }}
                                placeholder={dt.name}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        className="csm__btn csm__btn--primary"
                        onClick={async () => {
                          try {
                            await sheetsTabsApi.save(company.id, detectedTabs);
                            toast.success('✅ Pestañas guardadas. La próxima sincronización usará estas pestañas.');
                          } catch {
                            toast.error('Error al guardar');
                          }
                        }}
                      >
                        💾 Guardar pestañas ({detectedTabs.filter((t: any) => t.enabled).length} activas)
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: ETAPAS ────────────────────── */}
          {tab === 'stages' && (
            <div className="csm__section">
              <p className="csm__stages-desc">
                Cada etapa es una columna del Kanban. El <strong>rol</strong> define qué hace la plataforma cuando un lead está en esa etapa.
              </p>

              {/* Lista de etapas editables */}
              <div className="csm__stages-list">
                {editedStages?.map((stage: any, idx: number) => {
                  const roleInfo = ROLE_OPTIONS.find(r => r.value === stage.role) || ROLE_OPTIONS[5];
                  const RoleIcon = roleInfo.icon;
                  return (
                    <div key={stage.id} className="csm__stage-row">
                      <div className="csm__stage-grip">
                        <button
                          className="csm__stage-move"
                          onClick={() => moveStage(idx, 'up')}
                          disabled={idx === 0}
                          title="Subir"
                        >▲</button>
                        <span className="csm__stage-pos">{idx + 1}</span>
                        <button
                          className="csm__stage-move"
                          onClick={() => moveStage(idx, 'down')}
                          disabled={idx === (editedStages?.length || 0) - 1}
                          title="Bajar"
                        >▼</button>
                      </div>

                      <div
                        className="csm__stage-color-dot"
                        style={{ background: stage.color }}
                      />

                      <input
                        className="csm__stage-name-input"
                        value={stage.name}
                        onChange={(e) => updateStageField(idx, 'name', e.target.value)}
                        placeholder="Nombre de la etapa"
                      />

                      {/* Color picker mini */}
                      <div className="csm__stage-colors">
                        {COLOR_PALETTE.map((c) => (
                          <button
                            key={c}
                            className={`csm__stage-color-opt ${stage.color === c ? 'csm__stage-color-opt--active' : ''}`}
                            style={{ background: c }}
                            onClick={() => updateStageField(idx, 'color', c)}
                          />
                        ))}
                      </div>

                      {/* Role selector */}
                      <select
                        className="csm__stage-role-select"
                        value={stage.role}
                        onChange={(e) => updateStageField(idx, 'role', e.target.value)}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>

                      <div className="csm__stage-role-badge" style={{ color: roleInfo.color, background: roleInfo.color + '15', borderColor: roleInfo.color + '30' }}>
                        <RoleIcon size={12} />
                        <span>{roleInfo.desc}</span>
                      </div>

                      <button
                        className="csm__stage-delete"
                        onClick={() => {
                          if (stage._count?.leads > 0) {
                            toast.error(`Tiene ${stage._count.leads} leads. Mueve los leads primero.`);
                          } else {
                            deleteStageMutation.mutate(stage.id);
                          }
                        }}
                        disabled={deleteStageMutation.isPending}
                        title={stage._count?.leads > 0 ? `Tiene ${stage._count.leads} leads` : 'Eliminar etapa'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Agregar nueva etapa */}
              <div className="csm__stage-add">
                <Plus size={14} />
                <input
                  className="csm__stage-name-input"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="Nueva etapa..."
                />
                <select
                  className="csm__stage-role-select"
                  value={newStageRole}
                  onChange={(e) => setNewStageRole(e.target.value)}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <button
                  className="csm__btn csm__btn--secondary csm__btn--sm"
                  onClick={() => addStageMutation.mutate()}
                  disabled={addStageMutation.isPending || !newStageName.trim()}
                >
                  Agregar
                </button>
              </div>

              {/* Botón guardar cambios */}
              {hasChanges && (
                <div className="csm__stages-save">
                  <button
                    className="csm__btn csm__btn--primary"
                    onClick={() => saveStagesMutation.mutate()}
                    disabled={saveStagesMutation.isPending}
                  >
                    {saveStagesMutation.isPending ? 'Guardando...' : '💾 Guardar cambios en etapas'}
                  </button>
                </div>
              )}

              {/* Leyenda de roles */}
              <div className="csm__roles-legend">
                <div className="csm__roles-legend-title">¿Qué hace cada rol?</div>
                {ROLE_OPTIONS.map((r) => {
                  const Icon = r.icon;
                  return (
                    <div key={r.value} className="csm__roles-legend-item">
                      <Icon size={13} style={{ color: r.color }} />
                      <strong style={{ color: r.color }}>{r.label}</strong>
                      <span>{r.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TAB: ZONA DE PELIGRO ────────────── */}
          {tab === 'danger' && (
            <div className="csm__section">
              <div className="csm__danger-box">
                <div className="csm__danger-icon"><Trash2 size={24} /></div>
                <h3 className="csm__danger-title">Eliminar empresa permanentemente</h3>
                <p className="csm__danger-desc">
                  Esta acción eliminará <strong>{company.name}</strong> y todos sus datos: leads, etapas, notas, seguimientos y conexiones.
                  <strong> Esta acción no se puede deshacer.</strong>
                </p>

                <div className="csm__field">
                  <label className="csm__label">
                    Para confirmar, escribe el nombre de la empresa: <strong>{company.name}</strong>
                  </label>
                  <input
                    className="csm__input csm__input--danger"
                    placeholder={company.name}
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                  />
                </div>

                <button
                  className="csm__btn csm__btn--delete"
                  disabled={!canDelete || deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate()}
                >
                  <Trash2 size={14} />
                  {deleteMutation.isPending ? 'Eliminando...' : `Eliminar "${company.name}" para siempre`}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

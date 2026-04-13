import { useState } from 'react';
import { X, Building2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesApi } from '../../api';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
}

const COLORS = [
  '#2596DC', '#3B82F6', '#8B5CF6', '#EC4899',
  '#10B981', '#F59E0B', '#EF4444', '#6366F1',
];

export default function CreateCompanyModal({ onClose }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#2596DC');

  const createMutation = useMutation({
    mutationFn: () => companiesApi.create({ name, description: description || undefined, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success(`Empresa "${name}" creada ✅`);
      onClose();
    },
    onError: () => toast.error('Error al crear la empresa'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error('El nombre es obligatorio');
    createMutation.mutate();
  }

  return (
    <div
      className="ccm-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="ccm-modal">
        <div className="ccm-header">
          <div className="ccm-header-icon"><Building2 size={20} /></div>
          <h2>Nueva Empresa</h2>
          <button className="ccm-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="ccm-body">
          <div className="ccm-field">
            <label className="ccm-label">Nombre *</label>
            <input
              id="company-name-input"
              className="ccm-input"
              placeholder="ej: Advanced Investing"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="ccm-field">
            <label className="ccm-label">Descripción (opcional)</label>
            <input
              className="ccm-input"
              placeholder="ej: Empresa de inversiones en Colombia"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="ccm-field">
            <label className="ccm-label">Color identificador</label>
            <div className="ccm-colors">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`ccm-color-btn ${color === c ? 'ccm-color-btn--selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="ccm-footer">
            <button type="button" className="ccm-btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="ccm-btn-create"
              disabled={createMutation.isPending || !name.trim()}
            >
              {createMutation.isPending ? 'Creando...' : '✅ Crear empresa'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .ccm-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .ccm-modal {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 16px;
          width: 100%; max-width: 440px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.5);
          overflow: hidden;
        }
        .ccm-header {
          display: flex; align-items: center; gap: 12px;
          padding: 20px 24px;
          border-bottom: 1px solid #30363d;
          background: linear-gradient(135deg, #0d1117, #161b22);
        }
        .ccm-header-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: #2596dc20; color: #2596dc;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ccm-header h2 { flex: 1; margin: 0; font-size: 17px; color: #e6edf3; }
        .ccm-close {
          background: none; border: none; color: #8b949e;
          cursor: pointer; padding: 4px; border-radius: 6px;
          display: flex; align-items: center;
          transition: all 0.2s;
        }
        .ccm-close:hover { background: #30363d; color: #e6edf3; }
        .ccm-body { padding: 24px; display: flex; flex-direction: column; gap: 18px; }
        .ccm-field { display: flex; flex-direction: column; gap: 6px; }
        .ccm-label { font-size: 11px; font-weight: 700; color: #8b949e; text-transform: uppercase; letter-spacing: 0.05em; }
        .ccm-input {
          background: #0d1117; border: 1px solid #30363d;
          border-radius: 8px; color: #e6edf3; font-size: 14px;
          padding: 10px 14px; outline: none; width: 100%;
          box-sizing: border-box; transition: border-color 0.2s;
          font-family: inherit;
        }
        .ccm-input:focus { border-color: #2596dc; }
        .ccm-input::placeholder { color: #484f58; }
        .ccm-colors { display: flex; gap: 10px; flex-wrap: wrap; }
        .ccm-color-btn {
          width: 30px; height: 30px; border-radius: 50%;
          border: 3px solid transparent; cursor: pointer;
          transition: all 0.2s; flex-shrink: 0;
        }
        .ccm-color-btn--selected { border-color: white; transform: scale(1.2); }
        .ccm-color-btn:hover { transform: scale(1.15); }
        .ccm-footer { display: flex; gap: 10px; justify-content: flex-end; padding-top: 4px; }
        .ccm-btn-cancel {
          background: none; border: 1px solid #30363d; border-radius: 8px;
          color: #8b949e; font-size: 13px; padding: 8px 18px; cursor: pointer;
          transition: all 0.2s;
        }
        .ccm-btn-cancel:hover { background: #30363d; color: #e6edf3; }
        .ccm-btn-create {
          background: linear-gradient(135deg, #2596dc, #1a7ab8);
          border: none; border-radius: 8px; color: white;
          font-size: 13px; font-weight: 600; padding: 8px 22px;
          cursor: pointer; transition: all 0.2s;
        }
        .ccm-btn-create:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(37,150,220,0.3); }
        .ccm-btn-create:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

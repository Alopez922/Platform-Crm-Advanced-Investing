import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Building2 } from 'lucide-react';
import { api } from '../../api/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './NotificationBell.css';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const prevCountRef = useRef(0);

  // Polling cada 30s
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications') as any;
      return res.data;
    },
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Toast cuando llegan notificaciones nuevas
  useEffect(() => {
    if (unreadCount > prevCountRef.current && prevCountRef.current > 0) {
      const newest = notifications[0];
      if (newest) {
        toast.custom((t) => (
          <div
            className={`notif-toast ${t.visible ? 'notif-toast--in' : 'notif-toast--out'}`}
            onClick={() => toast.dismiss(t.id)}
          >
            <div className="notif-toast__icon">🔔</div>
            <div className="notif-toast__body">
              <div className="notif-toast__title">{newest.title}</div>
              <div className="notif-toast__sub">{newest.body}</div>
            </div>
          </div>
        ), { duration: 5000, position: 'top-right' });
      }
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Marcar todas como leídas
  const readAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all') as any,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // Marcar una como leída y navegar
  const readOneMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`) as any,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  function handleNotifClick(notif: any) {
    readOneMutation.mutate(notif.id);
    if (notif.company?.slug) {
      navigate(`/empresa/${notif.company.slug}`);
    }
    setOpen(false);
  }

  return (
    <div className="notif-bell" ref={dropdownRef}>
      <button
        className={`notif-bell__btn ${unreadCount > 0 ? 'notif-bell__btn--active' : ''}`}
        onClick={() => setOpen(!open)}
        title="Notificaciones"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notif-bell__badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown__header">
            <span className="notif-dropdown__title">Notificaciones</span>
            {unreadCount > 0 && (
              <button
                className="notif-dropdown__read-all"
                onClick={() => readAllMutation.mutate()}
              >
                <CheckCheck size={13} />
                Marcar todas
              </button>
            )}
          </div>

          <div className="notif-dropdown__list">
            {notifications.length === 0 ? (
              <div className="notif-dropdown__empty">
                <Bell size={24} />
                <p>Sin notificaciones</p>
              </div>
            ) : (
              notifications.map((notif: any) => (
                <div
                  key={notif.id}
                  className={`notif-item ${!notif.isRead ? 'notif-item--unread' : ''}`}
                  onClick={() => handleNotifClick(notif)}
                >
                  <div
                    className="notif-item__dot"
                    style={{ background: notif.company?.color || '#2596DC' }}
                  />
                  <div className="notif-item__body">
                    <div className="notif-item__title">{notif.title}</div>
                    <div className="notif-item__sub">{notif.body}</div>
                    <div className="notif-item__meta">
                      <Building2 size={10} />
                      <span>{notif.company?.name}</span>
                      <span>·</span>
                      <span>
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                  </div>
                  {!notif.isRead && <div className="notif-item__dot-unread" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

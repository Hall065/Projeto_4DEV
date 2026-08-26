import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { notificationService, type Notificacao } from '@/services/notification.service';

const makeChannelName = (prefix: string, id: string) =>
  `${prefix}-${id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function useNotifications(userId?: string | null) {
  const [notifications, setNotifications] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [markingAll, setMarkingAll] = useState(false);
  const requestSequence = useRef(0);

  const reload = useCallback(async () => {
    if (!userId) {
      requestSequence.current += 1;
      setNotifications([]);
      setLoading(false);
      setError(null);
      return false;
    }

    const sequence = ++requestSequence.current;
    setLoading(true);
    try {
      const data = await notificationService.listByUser(userId);
      if (sequence !== requestSequence.current) return false;
      setNotifications(data);
      setError(null);
      return true;
    } catch {
      if (sequence !== requestSequence.current) return false;
      setError('Nao foi possivel atualizar as notificacoes. Tente novamente.');
      return false;
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!userId) return undefined;

    const channel = supabase.channel(makeChannelName('hub-notificacoes', userId));

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'hub',
        table: 'notificacoes',
        filter: `usuario_id=eq.${userId}`,
      },
      () => void reload()
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload, userId]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.lida).length,
    [notifications]
  );

  const markAsRead = useCallback(
    async (id: string) => {
      if (!userId) return false;
      const previous = notifications.find((item) => item.id === id);
      if (!previous || previous.lida || pendingIds.includes(id)) return Boolean(previous);

      setPendingIds((current) => [...current, id]);
      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, lida: true } : item))
      );
      setError(null);
      try {
        await notificationService.markAsRead(id, userId);
        await reload();
        return true;
      } catch {
        setNotifications((current) =>
          current.map((item) => (item.id === id ? previous : item))
        );
        setError('Nao foi possivel marcar a notificacao como lida.');
        return false;
      } finally {
        setPendingIds((current) => current.filter((itemId) => itemId !== id));
      }
    },
    [notifications, pendingIds, reload, userId]
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId || markingAll) return false;
    const previousById = new Map(notifications.map((item) => [item.id, item]));
    setMarkingAll(true);
    setNotifications((current) => current.map((item) => ({ ...item, lida: true })));
    setError(null);
    try {
      await notificationService.markAllAsRead(userId);
      await reload();
      return true;
    } catch {
      setNotifications((current) =>
        current.map((item) => previousById.get(item.id) ?? item)
      );
      setError('Nao foi possivel marcar todas as notificacoes como lidas.');
      return false;
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll, notifications, reload, userId]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    pendingIds,
    markingAll,
    reload,
    markAsRead,
    markAllAsRead,
    clearError: () => setError(null),
  };
}

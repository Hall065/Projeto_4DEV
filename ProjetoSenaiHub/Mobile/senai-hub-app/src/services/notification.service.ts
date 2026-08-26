import { supabase } from '@/lib/supabase';

export interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
  usuario_id?: string;
}

export const notificationService = {
  async listByUser(userId: string): Promise<Notificacao[]> {
    const { data, error } = await supabase
      .schema('hub')
      .from('notificacoes')
      .select('*')
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Notificacao[];
  },

  async countUnread(userId: string): Promise<number> {
    const { data, error } = await supabase
      .schema('hub')
      .from('notificacoes')
      .select('id')
      .eq('usuario_id', userId)
      .eq('lida', false);

    if (error) return 0;
    return data?.length ?? 0;
  },

  async markAsRead(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .schema('hub')
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', id)
      .eq('usuario_id', userId);

    if (error) throw error;
  },

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .schema('hub')
      .from('notificacoes')
      .update({ lida: true })
      .eq('usuario_id', userId)
      .eq('lida', false);

    if (error) throw error;
  },
};

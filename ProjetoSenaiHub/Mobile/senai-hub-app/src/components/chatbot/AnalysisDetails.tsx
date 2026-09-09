import { useState } from 'react';
import { Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AnimatedPressable } from '@/components/common/VisualPrimitives';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useI18n } from '@/hooks/useI18n';
import { useChatbotStore } from '@/stores/chatbot.store';
import { useChatbotTaskDraftStore } from '@/stores/chatbot-task-draft.store';
import { useAuthStore } from '@/stores/auth.store';
import type { ChatMessage } from '@/services/chatbot.service';

type Evidence = { id: string; label: string; route: string; record_id?: string; record?: Record<string, unknown>; summary?: Record<string, unknown> };
type Action = { title: string; evidence_ids: string[]; priority: string; rationale: string; owner_role: string; deadline: string; dependencies: string; indicator: string; success_criterion: string; review_at: string };

function evidenceText(value: unknown, indent = ''): string {
  if (value === null || value === undefined) return 'Não informado';
  if (Array.isArray(value)) return value.map((item) => evidenceText(item, indent)).join('\n');
  if (typeof value === 'object') return Object.entries(value as Record<string, unknown>).map(([key, item]) => `${indent}${key.replace(/_/g, ' ')}: ${item !== null && typeof item === 'object' ? '\n' + evidenceText(item, indent + '  ') : evidenceText(item)}`).join('\n');
  return String(value);
}

export function AnalysisDetails({ message }: { message: ChatMessage }) {
  const theme = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const role = useAuthStore((state) => state.session?.perfil?.tipo);
  const savePlan = useChatbotStore((state) => state.savePlan);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const metadata = message.metadata ?? {};
  const [note, setNote] = useState(String(metadata.plan_note ?? ''));
  const [status, setStatus] = useState(String(metadata.plan_status ?? 'proposto'));
  const actions = (Array.isArray(metadata.actions) ? metadata.actions : []) as Action[];
  const evidence = (Array.isArray(metadata.evidence) ? metadata.evidence : []) as Evidence[];
  const context = metadata.page_context as { title?: string; route?: string; filters?: Record<string, unknown>; captured_at?: string } | undefined;
  const canCreate = ['admin', 'direcao', 'gerente_manutencao', 'grid_chefe'].includes(role ?? '') && context?.route?.startsWith('/grid');
  const textStyle = { color: theme.text, fontSize: 12, lineHeight: 18 };
  const buttonStyle = { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: theme.line, marginTop: 6 };
  const persist = async () => {
    if (!message.id || busy) return;
    setBusy(true);
    try { await savePlan(message.id, true, note, status); } finally { setBusy(false); }
  };
  return <View style={{ gap: 7, marginTop: 8 }}>
    {context ? <Text style={{ ...textStyle, color: theme.textMuted }}>{context.title} • {Object.entries(context.filters ?? {}).filter(([, value]) => value !== '' && value != null).map(([key, value]) => `${key}: ${value}`).join(' • ') || t('Sem filtros adicionais')}{'\n'}{t('Consultado em')}: {String(metadata.queried_at ?? context.captured_at ?? '')}</Text> : null}
    {evidence.length ? <AnimatedPressable accessibilityRole="button" style={buttonStyle} onPress={() => setEvidenceOpen(true)}><Text style={textStyle}>{t('Ver evidências utilizadas')} ({evidence.length})</Text></AnimatedPressable> : null}
    {actions.map((action, index) => <View key={`${index}-${action.title}`} style={{ borderTopWidth: 1, borderColor: theme.line, paddingTop: 8, gap: 4 }}>
      <Text style={{ ...textStyle, fontWeight: '800' }}>{index + 1}. {action.title}</Text>
      <Text style={textStyle}>{t('Prioridade')}: {action.priority} • {action.rationale}</Text>
      <Text style={textStyle}>{t('Responsável sugerido')}: {action.owner_role}</Text>
      <Text style={textStyle}>{t('Prazo proposto')}: {action.deadline}</Text>
      <Text style={textStyle}>{t('Dependências')}: {action.dependencies}</Text>
      <Text style={textStyle}>{t('Indicador')}: {action.indicator}</Text>
      <Text style={textStyle}>{t('Critério de sucesso')}: {action.success_criterion}</Text>
      <Text style={textStyle}>{t('Reavaliar em')}: {action.review_at}</Text>
      <Text style={textStyle}>{t('Evidências')}: {action.evidence_ids.join(', ')}</Text>
      {canCreate ? <AnimatedPressable accessibilityRole="button" style={buttonStyle} onPress={() => {
        const ticket = evidence.find((item) => action.evidence_ids.includes(item.id) && item.id.startsWith('chamados:') && item.record_id);
        useChatbotTaskDraftStore.getState().setDraft({ titulo: action.title, descricao: `${action.rationale}\n${action.indicator}\n${action.success_criterion}`, prioridade: action.priority, chamado_id: ticket?.record_id, observacao: `Sugestão do assistente. Prazo proposto: ${action.deadline}. Reavaliação: ${action.review_at}. Evidências: ${action.evidence_ids.join(', ')}` });
        useChatbotStore.getState().close();
        router.push('/grid/tarefas' as never);
      }}><Text style={textStyle}>{t('Revisar como nova tarefa')}</Text></AnimatedPressable> : null}
    </View>)}
    {actions.length ? <View style={{ gap: 6 }}>
      <Text style={textStyle}>{metadata.plan_saved === true ? t('Plano salvo nesta conversa') : t('Salvar plano e acompanhar')}</Text>
      <TextInput accessibilityLabel={t('Notas de acompanhamento do plano')} placeholder={t('Notas de acompanhamento')} placeholderTextColor={theme.textMuted} value={note} onChangeText={setNote} maxLength={1600} multiline style={{ ...textStyle, borderColor: theme.line, borderWidth: 1, padding: 8, borderRadius: 6 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>{['proposto', 'em_andamento', 'concluido'].map((value) => <AnimatedPressable key={value} accessibilityRole="button" accessibilityState={{ selected: status === value }} onPress={() => setStatus(value)} style={buttonStyle}><Text style={{ ...textStyle, fontWeight: status === value ? '900' : '400' }}>{t(value === 'proposto' ? 'Proposto' : value === 'em_andamento' ? 'Em andamento' : 'Concluído')}</Text></AnimatedPressable>)}</View>
      <AnimatedPressable accessibilityRole="button" disabled={busy} onPress={() => void persist()} style={buttonStyle}><Text style={textStyle}>{busy ? t('Salvando...') : t('Salvar plano e acompanhamento')}</Text></AnimatedPressable>
    </View> : null}
    <Modal visible={evidenceOpen} transparent animationType="slide" onRequestClose={() => setEvidenceOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.overlay }}>
        <View style={{ maxHeight: '85%', backgroundColor: theme.surface, padding: 18, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
          <AnimatedPressable accessibilityRole="button" style={buttonStyle} onPress={() => setEvidenceOpen(false)}><Text style={textStyle}>{t('Fechar evidências')}</Text></AnimatedPressable>
          <ScrollView contentContainerStyle={{ paddingVertical: 14, gap: 16 }}>
            <Text style={textStyle}>{t('Evidências registradas no momento da consulta. Atualize a análise para verificar mudanças.')}</Text>
            {evidence.map((item) => <View key={item.id} style={{ gap: 5 }}><Text style={{ ...textStyle, fontWeight: '800' }}>{item.label}</Text><Text selectable style={textStyle}>{item.id}</Text><Text selectable style={textStyle}>{evidenceText(item.record ?? item.summary)}</Text></View>)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}

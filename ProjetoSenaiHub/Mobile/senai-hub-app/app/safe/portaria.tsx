import { useFocusEffect } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { useCallback } from 'react';
import { View } from 'react-native';
import { AppButton, FeedbackMessage, SurfaceCard } from '@/components/common/VisualPrimitives';
import { SafeAuthorizationRow } from '@/components/safe/SafeAuthorizationRow';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors } from '@/constants/colors';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useSafeStore } from '@/stores/safe.store';

export default function SafePortariaScreen() {
  const { confirm } = useConfirmDialog();
  const authorizations = useSafeStore((state) => state.authorizations);
  const loading = useSafeStore((state) => state.loading);
  const submittingId = useSafeStore((state) => state.submittingId);
  const error = useSafeStore((state) => state.error);
  const loadAuthorizations = useSafeStore((state) => state.loadAuthorizations);
  const decide = useSafeStore((state) => state.decideAsPortaria);

  useFocusEffect(useCallback(() => { void loadAuthorizations({ status: 'liberado_portaria' }); }, [loadAuthorizations]));

  const act = async (id: string, approve: boolean) => {
    const confirmed = await confirm({
      title: approve ? 'Confirmar saida' : 'Recusar saida',
      message: approve
        ? 'Confirme apenas apos validar presencialmente a liberacao do aluno.'
        : 'A solicitacao sera negada e nao podera ser alterada.',
      confirmLabel: approve ? 'Confirmar' : 'Recusar',
    });
    if (confirmed) await decide(id, approve);
  };

  return (
    <ModuleScreen
      analysis={{ datasets: { autorizacoes: authorizations }, filters: { status: 'liberado_portaria' }, error }}
      title="Portaria"
      kicker="Validacao presencial"
      description="Confirme somente saidas previamente liberadas pelo professor."
      isLoading={loading && authorizations.length === 0}
      isEmpty={!loading && !error && authorizations.length === 0}
      emptyTitle="Nenhuma saida aguardando validacao"
    >
      {error ? <FeedbackMessage variant="danger" message={error} /> : null}
      <SurfaceCard title="Saidas liberadas" subtitle={String(authorizations.length) + ' solicitacao(oes)'}>
        {authorizations.map((item) => (
          <View key={item.id}>
            <SafeAuthorizationRow item={item} />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <AppButton label="Recusar" variant="secondary" accent={colors.red} icon={<X size={15} color={colors.red} />} onPress={() => void act(item.id, false)} loading={submittingId === item.id} wrapperStyle={{ flex: 1 }} />
              <AppButton label="Confirmar" accent={colors.green} icon={<Check size={15} color={colors.white} />} onPress={() => void act(item.id, true)} loading={submittingId === item.id} wrapperStyle={{ flex: 1 }} />
            </View>
          </View>
        ))}
      </SurfaceCard>
    </ModuleScreen>
  );
}

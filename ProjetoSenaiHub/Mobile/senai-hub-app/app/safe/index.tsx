import { useFocusEffect, useRouter } from 'expo-router';
import { CheckCircle2, ClipboardCheck, DoorOpen, ShieldAlert, Timer } from 'lucide-react-native';
import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { SafeAuthorizationRow } from '@/components/safe/SafeAuthorizationRow';
import { MetricGrid } from '@/components/common/MetricGrid';
import { FeedbackMessage, MetricTile, SurfaceCard } from '@/components/common/VisualPrimitives';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { colors } from '@/constants/colors';
import { ROUTES } from '@/constants/routes';
import { hasPermission } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth.store';
import { useSafeStore } from '@/stores/safe.store';
import { useI18n } from '@/hooks/useI18n';

export default function SafeDashboardScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const role = useAuthStore((state) => state.session?.perfil?.tipo);
  const dashboard = useSafeStore((state) => state.dashboard);
  const loading = useSafeStore((state) => state.loading);
  const error = useSafeStore((state) => state.error);
  const loadDashboard = useSafeStore((state) => state.loadDashboard);

  useFocusEffect(useCallback(() => { void loadDashboard(); }, [loadDashboard]));

  const nextRoute = hasPermission(role, 'safe.authorizations.manage')
    ? ROUTES.safe.autorizacoes
    : hasPermission(role, 'safe.approve')
      ? ROUTES.safe.aprovacoes
      : ROUTES.safe.portaria;

  return (
    <ModuleScreen
      analysis={{ datasets: { autorizacoes: dashboard?.recentes ?? [] }, limitations: ['Somente as oito autorizações recentes do painel. Indicadores da fila completa não estão incluídos.'], error }}
      title="SENAI Safe"
      kicker="Seguranca escolar"
      description="Acompanhe as autorizacoes visiveis para o seu papel."
      actionLabel="Abrir fila"
      onActionPress={() => router.push(nextRoute as never)}
      isLoading={loading && !dashboard}
    >
      {error ? <FeedbackMessage variant="danger" message={error} /> : null}
      <MetricGrid>
        <MetricTile label="Aguardando professor" value={dashboard?.aguardandoProfessor ?? 0} accent={colors.orange} icon={<Timer size={17} color={colors.orange} />} />
        <MetricTile label="Na portaria" value={dashboard?.liberadoPortaria ?? 0} accent={colors.blue} icon={<DoorOpen size={17} color={colors.blue} />} />
        <MetricTile label="Finalizadas hoje" value={dashboard?.finalizadosHoje ?? 0} accent={colors.green} icon={<CheckCircle2 size={17} color={colors.green} />} />
        <MetricTile label="Negadas" value={dashboard?.negados ?? 0} accent={colors.red} icon={<ShieldAlert size={17} color={colors.red} />} />
      </MetricGrid>
      <SurfaceCard title="Atividade recente" subtitle="Solicitacoes que seu perfil pode acompanhar">
        {dashboard?.recentes.length ? (
          dashboard.recentes.map((item) => <SafeAuthorizationRow key={item.id} item={item} />)
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <ClipboardCheck size={28} color={colors.grayText} />
            <Text style={{ color: colors.grayText, fontSize: 12, fontWeight: '700', marginTop: 8 }}>
              {t("Nenhuma autorizacao disponivel nesta fila.")}</Text>
          </View>
        )}
      </SurfaceCard>
    </ModuleScreen>
  );
}

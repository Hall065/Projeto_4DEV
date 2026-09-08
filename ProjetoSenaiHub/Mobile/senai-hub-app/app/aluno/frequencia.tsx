import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FileText } from 'lucide-react-native';
import { ExportModal } from '@/components/common/ExportModal';
import { AppButton, ListRow, LoadingState, ProgressBar, RingMetric, SurfaceCard } from '@/components/common/VisualPrimitives';
import { colors, connectTheme } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { exportService } from '@/services/export.service';
import { studentService, type StudentDashboardData } from '@/services/student.service';
import { useAuthStore } from '@/stores/auth.store';
import { useI18n } from '@/hooks/useI18n';

export default function AlunoFrequenciaScreen() {
  const { t } = useI18n();
  const session = useAuthStore((s) => s.session);
  const theme = useThemeColors();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [data, setData] = useState<StudentDashboardData | null>(null);

  useEffect(() => {
    if (!session?.userId) return;
    setLoading(true);
    studentService
      .getDashboard(session.userId, month)
      .then(setData)
      .finally(() => setLoading(false));
  }, [month, session?.userId]);

  if (loading) return <LoadingState />;

  const frequencias = data?.frequencias ?? [];
  const salario = data?.salario;
  const presentes = frequencias.filter((item) => item.status === 'presente').length;
  const percentual = frequencias.length ? Math.round((presentes / frequencias.length) * 100) : 0;
  const rows = [
    {
      aluno: data?.aluno?.nome,
      mes: month,
      salario_base: salario?.salario_base,
      valor_dia: salario?.valor_dia,
      desconto: salario?.desconto,
      salario_final: salario?.salario_final,
      faltas_injustificadas: salario?.faltas_injustificadas,
      frequencia_percentual: salario?.frequencia_percentual ?? percentual,
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.appBackground }]} contentContainerStyle={styles.content}>
      <SurfaceCard title="Frequencia e salario" subtitle="Calculo automatico do mes">
        <View style={styles.monthRow}>
          <AppButton label="Mes anterior" variant="secondary" accent={colors.navy} onPress={() => setMonth((current) => shiftMonth(current, -1))} />
          <Text style={[styles.month, { color: theme.text }]}>{month}</Text>
          <AppButton label="Proximo" variant="secondary" accent={colors.navy} onPress={() => setMonth((current) => shiftMonth(current, 1))} />
        </View>
        <View style={styles.ringRow}>
          <RingMetric value={`${salario?.frequencia_percentual ?? percentual}%`} label="frequencia" accent={colors.green} />
          <View style={styles.salaryBox}>
            <Text style={[styles.salaryLabel, { color: theme.textMuted }]}>{t("Valor final")}</Text>
            <Text style={styles.salaryValue}>{t("R$")}{' '}{Math.round(salario?.salario_final ?? 0).toLocaleString('pt-BR')}</Text>
            <ProgressBar value={salario?.frequencia_percentual ?? percentual} accent={colors.green} />
          </View>
        </View>
        <View style={styles.actionRow}>
          <AppButton
            label="Exportar holerite"
            accent={connectTheme.accent}
            icon={<FileText size={16} color={colors.white} />}
            onPress={() => setExportOpen(true)}
          />
        </View>
      </SurfaceCard>

      <SurfaceCard title="Detalhes do calculo" subtitle="Formula baseada na frequencia">
        <ListRow title="Salario base" meta={`R$ ${Math.round(salario?.salario_base ?? 0).toLocaleString('pt-BR')}`} initials="SB" accent={colors.blue} />
        <ListRow title="Valor por dia" meta={`R$ ${(salario?.valor_dia ?? 0).toLocaleString('pt-BR')}`} initials="VD" accent={colors.green} />
        <ListRow title="Desconto" meta={`R$ ${(salario?.desconto ?? 0).toLocaleString('pt-BR')}`} initials="DS" accent={colors.red} />
        <ListRow title="Faltas injustificadas" meta={`${salario?.faltas_injustificadas ?? 0}`} initials="FI" accent={colors.orange} />
      </SurfaceCard>

      <SurfaceCard title="Lancamentos" subtitle="Presencas e faltas no mes">
        {frequencias.map((item) => (
          <ListRow
            key={item.id}
            title={item.disciplina ?? 'Aula'}
            subtitle={item.data_aula ?? item.data ?? 'Sem data'}
            badge={item.status}
            badgeVariant={item.status === 'presente' ? 'success' : item.status === 'falta_justificada' ? 'warning' : 'danger'}
            initials="FR"
            accent={colors.green}
          />
        ))}
        {frequencias.length === 0 ? <Text style={[styles.empty, { color: theme.textMuted }]}>{t("Nenhum lancamento encontrado para este mes.")}</Text> : null}
      </SurfaceCard>

      <ExportModal
        visible={exportOpen}
        title="Exportar holerite"
        onClose={() => setExportOpen(false)}
        onPDF={async () => {
          await exportService.exportarPDF(rows, `Holerite ${month}`);
          setExportOpen(false);
        }}
        onExcel={async () => {
          await exportService.exportarExcel(rows, `holerite-${month}`);
          setExportOpen(false);
        }}
      />
    </ScrollView>
  );
}

function shiftMonth(value: string, delta: number) {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return date.toISOString().slice(0, 7);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 14, paddingBottom: 24 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  month: { color: colors.navy, fontSize: 15, fontWeight: '900' },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16 },
  salaryBox: { flex: 1, gap: 8 },
  salaryLabel: { color: colors.grayText, fontSize: 12, fontWeight: '800' },
  salaryValue: { color: connectTheme.accent, fontSize: 26, fontWeight: '900' },
  actionRow: { marginTop: 14 },
  empty: { color: colors.grayText, fontSize: 12, fontWeight: '700' },
});

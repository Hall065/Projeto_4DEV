import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { CrudModal, type CrudField } from '@/components/common/CrudModal';
import { FeedbackMessage, SearchField, SurfaceCard } from '@/components/common/VisualPrimitives';
import { SafeAuthorizationRow } from '@/components/safe/SafeAuthorizationRow';
import { ModuleScreen } from '@/components/screens/ModuleScreen';
import { useSafeStore } from '@/stores/safe.store';
import { useI18n } from '@/hooks/useI18n';

function initialScheduledDate() {
  const value = new Date();
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
}

export default function SafeAuthorizationsScreen() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const authorizations = useSafeStore((state) => state.authorizations);
  const students = useSafeStore((state) => state.students);
  const loading = useSafeStore((state) => state.loading);
  const submitting = useSafeStore((state) => state.submittingId === 'create');
  const error = useSafeStore((state) => state.error);
  const loadAuthorizations = useSafeStore((state) => state.loadAuthorizations);
  const loadStudents = useSafeStore((state) => state.loadStudents);
  const createAuthorization = useSafeStore((state) => state.createAuthorization);

  useFocusEffect(useCallback(() => {
    void loadAuthorizations();
    void loadStudents();
  }, [loadAuthorizations, loadStudents]));

  const fields = useMemo<CrudField[]>(() => [
    {
      name: 'aluno_id',
      label: 'Aluno',
      required: true,
      options: students.map((student) => ({
        value: student.id,
        label: student.nome,
        description: student.turma_nome ?? 'Sem turma vinculada',
      })),
    },
    {
      name: 'tipo',
      label: 'Tipo de autorizacao',
      required: true,
      options: [
        { value: 'entrada', label: 'Entrada' },
        { value: 'saida', label: 'Saida' },
      ],
    },
    { name: 'motivo', label: 'Motivo', required: true, multiline: true, placeholder: 'Descreva o motivo da solicitacao' },
    { name: 'agendada_em', label: 'Data e horario', required: true, placeholder: 'AAAA-MM-DDTHH:MM' },
    { name: 'quantidade_faltas', label: 'Quantidade de faltas', keyboardType: 'numeric', placeholder: 'Opcional, de 0 a 5' },
    { name: 'observacoes', label: 'Observacoes', multiline: true, placeholder: 'Opcional' },
  ], [students]);

  const filtered = authorizations.filter((item) => {
    const value = search.trim().toLocaleLowerCase('pt-BR');
    if (!value) return true;
    return [item.aluno_nome, item.turma_nome, item.protocolo, item.status].join(' ').toLocaleLowerCase('pt-BR').includes(value);
  });

  return (
    <>
      <ModuleScreen
        title="Autorizacoes"
        kicker="AQV"
        description="Crie e acompanhe solicitacoes de entrada e saida."
        actionLabel="Nova"
        onActionPress={() => setCreating(true)}
        isLoading={loading && authorizations.length === 0}
        isEmpty={!loading && !error && authorizations.length === 0}
        emptyTitle="Nenhuma autorizacao criada"
      >
        {error ? <FeedbackMessage variant="danger" message={error} /> : null}
        <SearchField placeholder={t("Buscar aluno, turma ou protocolo")} value={search} onChangeText={setSearch} />
        <SurfaceCard title="Solicitacoes" subtitle={String(filtered.length) + ' resultado(s)'}>
          {filtered.map((item) => <SafeAuthorizationRow key={item.id} item={item} />)}
        </SurfaceCard>
      </ModuleScreen>
      <CrudModal
        visible={creating}
        title="Nova autorizacao"
        fields={fields}
        initialValues={{ tipo: 'entrada', agendada_em: initialScheduledDate() }}
        submitLabel="Enviar ao professor"
        isSubmitting={submitting}
        onClose={() => setCreating(false)}
        onSubmit={async (values) => {
          const scheduled = new Date(values.agendada_em);
          if (Number.isNaN(scheduled.getTime())) throw new Error('Informe data e horario em formato valido.');
          const absenceText = values.quantidade_faltas.trim();
          const absences = absenceText ? Number(absenceText) : null;
          if (absences !== null && (!Number.isInteger(absences) || absences < 0 || absences > 5)) {
            throw new Error('A quantidade de faltas deve ser um numero inteiro entre 0 e 5.');
          }
          await createAuthorization({
            alunoId: values.aluno_id,
            tipo: values.tipo === 'saida' ? 'saida' : 'entrada',
            motivo: values.motivo,
            agendadaEm: scheduled.toISOString(),
            quantidadeFaltas: absences,
            observacoes: values.observacoes,
          });
          setCreating(false);
        }}
      />
    </>
  );
}

import { ListRow } from '@/components/common/VisualPrimitives';
import { colors } from '@/constants/colors';
import type { SafeAuthorization, SafeAuthorizationStatus } from '@/types/safe.types';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const STATUS_LABELS: Record<SafeAuthorizationStatus, string> = {
  pendente_aqv: 'Pendente AQV',
  aguardando_professor: 'Aguardando professor',
  liberado_portaria: 'Liberado para portaria',
  finalizado: 'Finalizado',
  negado: 'Negado',
};

const STATUS_VARIANTS: Record<SafeAuthorizationStatus, BadgeVariant> = {
  pendente_aqv: 'neutral',
  aguardando_professor: 'warning',
  liberado_portaria: 'info',
  finalizado: 'success',
  negado: 'danger',
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export function getSafeStatusLabel(status: SafeAuthorizationStatus) {
  return STATUS_LABELS[status];
}

export function SafeAuthorizationRow({ item, onPress }: { item: SafeAuthorization; onPress?: () => void }) {
  const typeLabel = item.tipo === 'entrada' ? 'Entrada' : 'Saida';
  const turma = item.turma_nome || 'Turma nao informada';

  return (
    <ListRow
      title={item.aluno_nome}
      subtitle={typeLabel + ' - ' + turma}
      meta={item.protocolo + ' - ' + formatDate(item.agendada_em)}
      badge={STATUS_LABELS[item.status]}
      badgeVariant={STATUS_VARIANTS[item.status]}
      initials={initials(item.aluno_nome)}
      accent={item.tipo === 'saida' ? colors.red : colors.blue}
      onPress={onPress}
    />
  );
}

import type { AppLanguage } from '@/stores/app.store';

const APP_LOCALES: Record<AppLanguage, string> = {
  'pt-BR': 'pt-BR',
  'en-US': 'en-US',
  'es-ES': 'es-ES',
  'fr-FR': 'fr-FR',
  'de-DE': 'de-DE',
  'it-IT': 'it-IT',
  'ja-JP': 'ja-JP',
  'zh-Hans': 'zh-Hans',
};

export function getAppLocale(language: AppLanguage): string {
  return APP_LOCALES[language];
}

export function formatAppDateTime(
  value: string | number | Date | null | undefined,
  language: AppLanguage,
  fallback: string
): string {
  if (value === null || value === undefined || value === '') return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(getAppLocale(language), {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatAppNumber(value: number, language: AppLanguage): string {
  return new Intl.NumberFormat(getAppLocale(language)).format(value);
}

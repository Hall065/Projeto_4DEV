import { supabase } from '@/lib/supabase';
import { getAzureLanguageCode, type AppLanguage } from '@/stores/app.store';

type TranslationFunctionResponse = {
  translations?: Record<string, string>;
};

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  const context = (error as {
    context?: { clone?: () => Response; json?: () => Promise<unknown> };
  })?.context;
  try {
    const response = context?.clone?.() ?? context;
    const payload = await response?.json?.();
    if (payload && typeof payload === 'object' && 'error' in payload) {
      const detail = String((payload as { error?: unknown }).error ?? '').trim();
      if (detail) return detail;
    }
  } catch {
    // O corpo pode ja ter sido consumido pelo cliente Supabase.
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Nao foi possivel acessar o servico seguro de traducao.';
}

/**
 * Traduz somente lotes de textos de interface previamente aprovados em useI18n.
 * A credencial do Azure fica na Edge Function translate-ui e nunca no bundle Expo.
 */
export async function translateTextsWithAzure(
  texts: string[],
  language: AppLanguage
): Promise<Record<string, string>> {
  const targetLanguage = getAzureLanguageCode(language);
  const uniqueTexts = Array.from(new Set(texts.map((text) => text.trim()).filter(Boolean)));

  if (!targetLanguage || uniqueTexts.length === 0) return {};

  const { data, error } = await supabase.functions.invoke<TranslationFunctionResponse>(
    'translate-ui',
    {
      body: {
        texts: uniqueTexts,
        sourceLanguage: 'pt',
        targetLanguage,
      },
    }
  );

  if (error) {
    throw new Error(`Traducao indisponivel. ${await getFunctionErrorMessage(error)}`);
  }

  if (!data?.translations || typeof data.translations !== 'object') {
    throw new Error('O servico de traducao retornou uma resposta invalida.');
  }

  return Object.fromEntries(
    uniqueTexts.flatMap((sourceText) => {
      const translatedText = data.translations?.[sourceText];
      return typeof translatedText === 'string' && translatedText.trim()
        ? [[sourceText, translatedText.trim()]]
        : [];
    })
  );
}

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_TARGET_LANGUAGES = new Set(['en', 'es', 'fr', 'de', 'it', 'ja', 'zh-Hans']);
const MAX_TEXTS = 25;
const MAX_CHARACTERS = 5_000;
const DEFAULT_ENDPOINT = 'https://api.cognitive.microsofttranslator.com';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function normalizeEndpoint(value: string | undefined) {
  const endpoint = (value ?? DEFAULT_ENDPOINT).trim().replace(/\/+$/, '');
  if (!endpoint.startsWith('https://')) {
    throw new Error('AZURE_TRANSLATOR_ENDPOINT deve usar HTTPS.');
  }
  return endpoint;
}

function getPublishableKey(): string | null {
  const legacyAnonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim();
  if (legacyAnonKey) return legacyAnonKey;

  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}') as Record<
      string,
      string
    >;
    return keys.default ?? Object.values(keys)[0] ?? null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Metodo nao permitido.' }, 405);

  // A verificacao JWT da plataforma deve permanecer habilitada no deploy.
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Autenticacao obrigatoria.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = getPublishableKey();
  if (!supabaseUrl || !publishableKey) {
    return jsonResponse({ error: 'Configuracao de autenticacao indisponivel.' }, 500);
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ error: 'Sessao invalida ou expirada.' }, 401);
  }

  const azureKey = Deno.env.get('AZURE_TRANSLATOR_KEY')?.trim();
  const azureRegion = Deno.env.get('AZURE_TRANSLATOR_REGION')?.trim();

  if (!azureKey) {
    return jsonResponse({ error: 'Azure Translator nao configurado no Supabase.' }, 503);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Corpo JSON invalido.' }, 400);
  }

  const body = payload as {
    texts?: unknown;
    sourceLanguage?: unknown;
    targetLanguage?: unknown;
  };
  const sourceLanguage = body.sourceLanguage === 'pt' ? 'pt' : null;
  const targetLanguage =
    typeof body.targetLanguage === 'string' && ALLOWED_TARGET_LANGUAGES.has(body.targetLanguage)
      ? body.targetLanguage
      : null;
  const texts = Array.isArray(body.texts)
    ? Array.from(
        new Set(
          body.texts
            .filter((text): text is string => typeof text === 'string')
            .map((text) => text.trim())
            .filter(Boolean)
        )
      )
    : [];

  if (!sourceLanguage || !targetLanguage) {
    return jsonResponse({ error: 'Idioma de origem ou destino nao permitido.' }, 400);
  }
  if (texts.length === 0 || texts.length > MAX_TEXTS) {
    return jsonResponse({ error: `Envie entre 1 e ${MAX_TEXTS} textos.` }, 400);
  }

  const characterCount = texts.reduce((total, text) => total + text.length, 0);
  if (characterCount > MAX_CHARACTERS) {
    return jsonResponse({ error: `O lote excede ${MAX_CHARACTERS} caracteres.` }, 400);
  }

  try {
    const endpoint = normalizeEndpoint(Deno.env.get('AZURE_TRANSLATOR_ENDPOINT'));
    const params = new URLSearchParams({
      'api-version': '3.0',
      from: sourceLanguage,
      to: targetLanguage,
    });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=UTF-8',
      'Ocp-Apim-Subscription-Key': azureKey,
    };
    if (azureRegion) headers['Ocp-Apim-Subscription-Region'] = azureRegion;

    const response = await fetch(`${endpoint}/translate?${params.toString()}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(texts.map((Text) => ({ Text }))),
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      const requestId = response.headers.get('x-requestid');
      console.error('[translate-ui] Azure error', response.status, requestId ?? 'sem request id');
      return jsonResponse(
        {
          error:
            response.status === 401 || response.status === 403
              ? 'Credencial ou regiao do Azure invalida.'
              : 'Azure Translator temporariamente indisponivel.',
          requestId,
        },
        response.status === 429 ? 429 : 502
      );
    }

    const azureData = (await response.json()) as {
      translations?: { text?: string }[];
    }[];
    const translations = texts.reduce<Record<string, string>>((result, sourceText, index) => {
      const translatedText = azureData[index]?.translations?.[0]?.text?.trim();
      if (translatedText) result[sourceText] = translatedText;
      return result;
    }, {});

    if (Object.keys(translations).length !== texts.length) {
      console.warn('[translate-ui] Azure returned an incomplete batch.');
    }

    return jsonResponse({ translations });
  } catch (error) {
    console.error('[translate-ui] Unexpected error', error);
    return jsonResponse({ error: 'Falha interna ao traduzir a interface.' }, 500);
  }
});

import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { createApexChartHtml } from './apex/html';
import type { ApexChartProps } from './apex/types';

export function ApexChart({ model, height = 238, reduceMotion = false, onSelect }: ApexChartProps) {
  const [error, setError] = useState<string | null>(null);
  const source = useMemo(
    () => ({ html: createApexChartHtml(model, !reduceMotion) }),
    [model, reduceMotion]
  );

  return (
    <View accessible accessibilityLabel={model.accessibilityLabel} style={[styles.wrap, { height }]}>
      <WebView
        key={model.id}
        originWhitelist={['*']}
        source={source}
        style={styles.webView}
        javaScriptEnabled
        domStorageEnabled={false}
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
        onMessage={(event) => {
          try {
            const message = JSON.parse(event.nativeEvent.data) as {
              type?: string;
              payload?: { index?: unknown; message?: unknown };
            };
            if (message.type === 'select' && Number.isInteger(message.payload?.index)) {
              onSelect?.(message.payload?.index as number);
              return;
            }
            if (message.type === 'error') {
              setError(typeof message.payload?.message === 'string' ? message.payload.message : 'Falha ao renderizar gráfico.');
            }
          } catch {
            setError('Falha ao comunicar com o gráfico.');
          }
        }}
      />
      {error ? <Text style={styles.error}>Gráfico indisponível: {error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', overflow: 'hidden' },
  webView: { flex: 1, backgroundColor: 'transparent' },
  error: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    left: 8,
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '700',
  },
});

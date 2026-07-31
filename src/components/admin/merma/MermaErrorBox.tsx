import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { WASTE_RETRY_LIMIT } from '@/common/waste';
import { colors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';

interface Props {
  readonly message: string;
  readonly context?: string;
  readonly retryCount: number;
  readonly onRetry: () => void;
}

export function MermaErrorBox({
  message,
  context,
  retryCount,
  onRetry,
}: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? colors.admErrorBgD : colors.admErrorBgL;
  const border = isDark ? colors.admErrorBorderD : colors.admErrorBorderL;
  const text = isDark ? colors.admErrorTextD : colors.admErrorTextL;
  const action = isDark ? colors.admErrorActionD : colors.admErrorActionL;
  const maxedOut = retryCount >= WASTE_RETRY_LIMIT;

  return (
    <View style={[styles.box, { backgroundColor: bg, borderColor: border }]}>
      <MaterialCommunityIcons name="alert-circle" size={22} color={text} />
      <View style={styles.content}>
        <Text style={[styles.text, { color: text }]}>
          {maxedOut
            ? 'No pudimos cargar los datos. Contactá al administrador.'
            : message}
        </Text>
        {context ? (
          <Text style={[styles.detail, { color: text }]}>
            Filtros aplicados: {context}
          </Text>
        ) : null}
        {!maxedOut && (
          <Text style={[styles.detail, { color: text }]}>
            Si el problema continúa, contactá al administrador.
          </Text>
        )}
      </View>
      {!maxedOut && (
        <Pressable onPress={onRetry}>
          <Text style={[styles.action, { color: action }]}>Reintentar</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  content: { flex: 1, gap: 4 },
  text: { fontSize: 14, fontWeight: '500' },
  detail: { fontSize: 12, fontWeight: '400', opacity: 0.85 },
  action: { fontSize: 13, fontWeight: '700' },
});

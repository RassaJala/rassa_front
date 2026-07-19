import React from 'react';
import { Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';

export default function ProductDetailScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? colors.admlBgD : colors.admlBgL;
  const fg = isDark ? colors.admlFgD : colors.admlFgL;
  const muted = isDark ? colors.admlMutedD : colors.admlMutedL;

  return (
    <View style={{ flex: 1, backgroundColor: bg, padding: 16 }}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialCommunityIcons
          name="package-variant-closed"
          size={64}
          color={muted}
        />
        <Text
          style={{
            marginTop: 16,
            fontSize: 20,
            fontWeight: '700',
            color: fg,
            textAlign: 'center',
          }}
        >
          Detalle del producto
        </Text>
        <Text
          style={{
            marginTop: 8,
            fontSize: 14,
            color: muted,
            textAlign: 'center',
            maxWidth: 260,
          }}
        >
          Próximamente podrás ver aquí toda la información del producto.
        </Text>
      </View>
    </View>
  );
}

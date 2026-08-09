import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { themeColors } from '@/constants/colors';

interface EmptyCartProps {
  readonly isDark: boolean;
}

export default function EmptyCart({
  isDark,
}: EmptyCartProps): React.JSX.Element {
  const tc = themeColors(isDark);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tc.bg }} edges={['top']}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <MaterialCommunityIcons
          name="cart-outline"
          size={64}
          color={tc.muted}
        />
        <Text
          style={{
            marginTop: 16,
            fontSize: 22,
            fontWeight: '700',
            color: tc.fg,
          }}
        >
          Carrito vacío
        </Text>
        <Text
          style={{
            marginTop: 8,
            fontSize: 14,
            color: tc.muted,
            textAlign: 'center',
          }}
        >
          Agregá productos desde el catálogo para comenzar tu compra.
        </Text>
      </View>
    </SafeAreaView>
  );
}

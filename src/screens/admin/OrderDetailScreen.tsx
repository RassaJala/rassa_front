import React from 'react';
import { Text, View } from 'react-native';

import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import OrderTimeline from '@/components/OrderTimeline';
import { colors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList } from '@/types';

export default function OrderDetailScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? colors.admBgD : colors.admBgL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;

  const route = useRoute<RouteProp<AdminStackParamList, 'OrderDetail'>>();
  const { orderId } = route.params;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: -0.02,
            color: fg,
          }}
        >
          Pedido #{orderId}
        </Text>
      </View>
      <View
        style={{
          flex: 1,
          backgroundColor: surface,
          marginHorizontal: 20,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: border,
          overflow: 'hidden',
        }}
      >
        <OrderTimeline orderId={orderId} />
      </View>
    </View>
  );
}

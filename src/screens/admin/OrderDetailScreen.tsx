import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

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
  const navigation =
    useNavigation<
      NativeStackNavigationProp<AdminStackParamList, 'OrderDetail'>
    >();

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 60,
          paddingHorizontal: 20,
          paddingBottom: 8,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => ({
            opacity: pressed ? 0.5 : 1,
            marginRight: 12,
            padding: 4,
          })}
        >
          <MaterialCommunityIcons name="arrow-left" size={28} color={fg} />
        </Pressable>
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

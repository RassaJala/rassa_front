import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, themeColors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';
import type { BuyerStackParamList } from '@/types';
import { formatMoney } from '@/utils/money';

type Nav = NativeStackNavigationProp<BuyerStackParamList>;
type Route = RouteProp<BuyerStackParamList, 'OrderSuccess'>;

export default function OrderSuccessScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const tc = themeColors(isDark);
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const { orderId, total, estado } = route.params;

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: tc.bg }}
      edges={['top']}
    >
      <View className="flex-1 items-center justify-center px-6">
        <MaterialCommunityIcons
          name="check-circle"
          size={88}
          color={colors.success}
        />
        <Text className="mt-5 text-2xl font-bold" style={{ color: tc.fg }}>
          ¡Pedido confirmado!
        </Text>
        <Text className="mt-2 text-base" style={{ color: tc.muted }}>
          {`Pedido N° ${orderId}`}
        </Text>
        <Text className="mt-1 text-xl font-bold" style={{ color: tc.fg }}>
          {formatMoney(total)}
        </Text>
        <View
          className="mt-3 rounded-lg px-3 py-1"
          style={{ backgroundColor: tc.accentBg }}
        >
          <Text
            className="text-xs font-semibold capitalize"
            style={{ color: tc.brand }}
          >
            {estado}
          </Text>
        </View>

        <Pressable
          testID="back-home-btn"
          onPress={() => navigation.navigate('BuyerTabs', { screen: 'Home' })}
          className="mt-8 rounded-xl px-8 py-3.5"
          style={{ backgroundColor: tc.brand }}
        >
          <Text
            className="text-[15px] font-bold"
            style={{ color: colors.iconWhite }}
          >
            Volver al inicio
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

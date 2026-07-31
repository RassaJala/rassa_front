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
    <SafeAreaView style={{ flex: 1, backgroundColor: tc.bg }} edges={['top']}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <MaterialCommunityIcons
          name="check-circle"
          size={88}
          color={colors.success}
        />
        <Text
          style={{
            marginTop: 20,
            fontSize: 24,
            fontWeight: '700',
            color: tc.fg,
          }}
        >
          ¡Pedido confirmado!
        </Text>
        <Text style={{ marginTop: 8, fontSize: 16, color: tc.muted }}>
          {`Pedido N° ${orderId}`}
        </Text>
        <Text
          style={{
            marginTop: 4,
            fontSize: 20,
            fontWeight: '700',
            color: tc.fg,
          }}
        >
          {`$${Number(total).toFixed(2)}`}
        </Text>
        <View
          style={{
            marginTop: 12,
            backgroundColor: tc.accentBg,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: tc.brand,
              textTransform: 'capitalize',
            }}
          >
            {estado}
          </Text>
        </View>

        <Pressable
          testID="back-home-btn"
          onPress={() => navigation.navigate('BuyerTabs', { screen: 'Home' })}
          style={{
            marginTop: 32,
            backgroundColor: tc.brand,
            borderRadius: 12,
            paddingHorizontal: 32,
            paddingVertical: 14,
          }}
        >
          <Text
            style={{ fontSize: 15, fontWeight: '700', color: colors.iconWhite }}
          >
            Volver al inicio
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

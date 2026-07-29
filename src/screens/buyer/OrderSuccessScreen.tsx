import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, themeColors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';
import type { BuyerStackParamList } from '@/types';

type Nav = NativeStackNavigationProp<BuyerStackParamList, 'OrderSuccess'>;
type Route = RouteProp<BuyerStackParamList, 'OrderSuccess'>;

export default function OrderSuccessScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { orderId, total } = route.params;

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const tc = themeColors(isDark);

  const handleViewOrders = useCallback(() => {
    navigation.navigate('BuyerTabs', { screen: 'Pedidos' });
  }, [navigation]);

  const handleGoHome = useCallback(() => {
    navigation.navigate('BuyerTabs', { screen: 'Home' });
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
        }}
      >
        {/* Success icon */}
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: tc.statusPublicadoBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <MaterialCommunityIcons name="check-circle" size={56} color={brand} />
        </View>

        {/* Title */}
        <Text
          style={{
            fontSize: 26,
            fontWeight: '700',
            color: fg,
            textAlign: 'center',
            letterSpacing: -0.3,
          }}
        >
          ¡Pedido confirmado!
        </Text>

        <Text
          style={{
            fontSize: 14,
            color: muted,
            textAlign: 'center',
            marginTop: 8,
            lineHeight: 20,
          }}
        >
          Tu pedido ha sido registrado exitosamente. El agricultor recibirá la
          notificación para prepararlo.
        </Text>

        {/* Order details card */}
        <View
          style={{
            backgroundColor: isDark ? colors.admSurfaceD : colors.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: isDark ? colors.admBorderD : colors.admBorderL,
            padding: 20,
            marginTop: 28,
            width: '100%',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 13, color: muted }}>Número de pedido</Text>
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: fg,
              marginTop: 4,
            }}
          >
            #{orderId}
          </Text>

          <View
            style={{
              width: '100%',
              height: 1,
              backgroundColor: isDark ? colors.admBorderD : colors.admBorderL,
              marginVertical: 14,
            }}
          />

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <Text style={{ fontSize: 14, color: muted }}>Total</Text>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: brand,
              }}
            >
              ${(Number.parseFloat(total) || 0).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Estado badge */}
        <View
          style={{
            backgroundColor: tc.statusBorradorBg,
            borderRadius: 10,
            paddingHorizontal: 16,
            paddingVertical: 6,
            marginTop: 16,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: colors.warning,
              textTransform: 'capitalize',
            }}
          >
            Pendiente de confirmación
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: 32,
          gap: 10,
        }}
      >
        <Pressable
          onPress={handleViewOrders}
          style={({ pressed }) => ({
            backgroundColor: brand,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.iconWhite,
            }}
          >
            Ver mis pedidos
          </Text>
        </Pressable>

        <Pressable
          onPress={handleGoHome}
          style={({ pressed }) => ({
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: isDark ? colors.admBorderD : colors.admBorderL,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: muted,
            }}
          >
            Seguir comprando
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

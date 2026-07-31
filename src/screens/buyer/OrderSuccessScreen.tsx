import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, themeColors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';
import type { BuyerStackParamList } from '@/types';
import { formatPrice } from '@/utils/format';

type Nav = NativeStackNavigationProp<BuyerStackParamList, 'OrderSuccess'>;
type Route = RouteProp<BuyerStackParamList, 'OrderSuccess'>;

export default function OrderSuccessScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { orderId, total } = route.params;
  const safeTotal =
    typeof total === 'string' || typeof total === 'number' ? Number(total) : 0;

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const themeTokens = themeColors(isDark);

  const styles = StyleSheet.create({
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    actionsContainer: {
      paddingHorizontal: 20,
      paddingBottom: 32,
      gap: 10,
    },
    divider: {
      width: '100%',
      height: 1,
      marginVertical: 14,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
    },
  });

  const dynStyles = useMemo(
    () =>
      ({
        screen: { flex: 1, backgroundColor: bg },
        successIconContainer: {
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: themeTokens.statusPublicadoBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        },
        title: {
          fontSize: 26,
          fontWeight: '700',
          color: fg,
          textAlign: 'center',
          letterSpacing: -0.3,
        },
        subtitle: {
          fontSize: 14,
          color: muted,
          textAlign: 'center',
          marginTop: 8,
          lineHeight: 20,
        },
        orderCard: {
          backgroundColor: surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: border,
          padding: 20,
          marginTop: 28,
          width: '100%',
          alignItems: 'center',
        },
        orderLabel: { fontSize: 13, color: muted },
        orderId: { fontSize: 28, fontWeight: '700', color: fg, marginTop: 4 },
        dividerColor: { backgroundColor: border },
        totalLabel: { fontSize: 14, color: muted },
        totalValue: { fontSize: 20, fontWeight: '700', color: brand },
        statusBadge: {
          backgroundColor: themeTokens.statusBorradorBg,
          borderRadius: 10,
          paddingHorizontal: 16,
          paddingVertical: 6,
          marginTop: 16,
        },
        statusBadgeText: {
          fontSize: 13,
          fontWeight: '600',
          color: colors.warning,
          textTransform: 'capitalize',
        },
        primaryBtn: {
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
        },
        primaryBtnText: {
          fontSize: 16,
          fontWeight: '700',
          color: colors.iconWhite,
        },
        secondaryBtn: {
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: border,
        },
        secondaryBtnText: {
          fontSize: 14,
          fontWeight: '600',
          color: muted,
        },
      }) as const,
    [bg, fg, muted, surface, border, brand, themeTokens],
  );

  const handleViewOrders = useCallback(() => {
    navigation.navigate('BuyerTabs', { screen: 'Pedidos' });
  }, [navigation]);

  const handleGoHome = useCallback(() => {
    navigation.navigate('BuyerTabs', { screen: 'Home' });
  }, [navigation]);

  return (
    <View style={dynStyles.screen}>
      <View style={styles.centerContainer}>
        {/* Success icon */}
        <View style={dynStyles.successIconContainer}>
          <MaterialCommunityIcons name="check-circle" size={56} color={brand} />
        </View>

        {/* Title */}
        <Text style={dynStyles.title}>¡Pedido confirmado!</Text>

        <Text style={dynStyles.subtitle}>
          Tu pedido ha sido registrado exitosamente. El agricultor recibirá la
          notificación para prepararlo.
        </Text>

        {/* Order details card */}
        <View style={dynStyles.orderCard}>
          <Text style={dynStyles.orderLabel}>Número de pedido</Text>
          <Text style={dynStyles.orderId}>#{orderId}</Text>

          <View style={[styles.divider, dynStyles.dividerColor]} />

          <View style={styles.totalRow}>
            <Text style={dynStyles.totalLabel}>Total</Text>
            <Text style={dynStyles.totalValue}>{formatPrice(safeTotal)}</Text>
          </View>
        </View>

        {/* Estado badge */}
        <View style={dynStyles.statusBadge}>
          <Text style={dynStyles.statusBadgeText}>
            Pendiente de confirmación
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <Pressable
          onPress={handleViewOrders}
          style={({ pressed }) => [
            dynStyles.primaryBtn,
            { backgroundColor: brand, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={dynStyles.primaryBtnText}>Ver mis pedidos</Text>
        </Pressable>

        <Pressable
          onPress={handleGoHome}
          style={({ pressed }) => [
            dynStyles.secondaryBtn,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={dynStyles.secondaryBtnText}>Seguir comprando</Text>
        </Pressable>
      </View>
    </View>
  );
}

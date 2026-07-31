import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BottomActionBar, HeaderBackButton } from '@/components/ui';
import { colors, themeColors } from '@/constants/colors';
import { useCreatePrivateConversation } from '@/features/chat/hooks/useCreatePrivateConversation';
import { useCartStore } from '@/store/cartStore';
import { useTheme } from '@/store/ThemeContext';
import type { BuyerStackParamList } from '@/types';
import { formatPrice } from '@/utils/format';

const HEADER_TOP_PADDING = 60;
const SCROLL_BOTTOM_PADDING = 140;
const FEEDBACK_DURATION_MS = 2000;

const styles = StyleSheet.create({
  headerTop: {
    paddingTop: HEADER_TOP_PADDING,
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: SCROLL_BOTTOM_PADDING,
  },
  importeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  bottomBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.iconWhite,
  },
  addedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
    flex: 1,
  },
});

type Nav = NativeStackNavigationProp<BuyerStackParamList, 'ProductDetail'>;
type Route = RouteProp<BuyerStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const addItem = useCartStore((s) => s.addItem);
  const createPrivateConversation = useCreatePrivateConversation();

  const { farmerId } = route.params;

  const handleContactFarmer = useCallback(() => {
    createPrivateConversation.mutate({ fk_usuario: farmerId });
  }, [createPrivateConversation, farmerId]);

  const {
    productoSemanalId,
    farmerName,
    nombreProducto,
    precio,
    stock,
    unidad,
  } = route.params;

  const [cantidad, setCantidad] = useState(1);
  const [added, setAdded] = useState(false);
  const addedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (addedTimeoutRef.current) clearTimeout(addedTimeoutRef.current);
    };
  }, []);

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const themeTokens = themeColors(isDark);
  const addedBg = themeTokens.statusPublicadoBg;

  const dynamicStyles = useMemo(
    () =>
      ({
        screen: { flex: 1, backgroundColor: bg },
        titleText: { fontSize: 22, fontWeight: '700', color: fg, flex: 1 },
        productCard: {
          backgroundColor: surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: border,
          padding: 20,
          marginBottom: 16,
        },
        priceText: {
          fontSize: 28,
          fontWeight: '700',
          color: brand,
          marginBottom: 12,
        },
        unitText: { fontSize: 14, fontWeight: '400', color: muted },
        farmerRow: {
          flexDirection: 'row',
          gap: 20,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: border,
        },
        labelSmall: { fontSize: 12, color: muted },
        valueSmall: {
          fontSize: 14,
          fontWeight: '600',
          color: fg,
          marginTop: 2,
        },
        sectionTitle: {
          fontSize: 16,
          fontWeight: '600',
          color: fg,
          marginBottom: 10,
        },
        qtySelector: {
          backgroundColor: surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: border,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        qtyText: {
          fontSize: 32,
          fontWeight: '700',
          color: fg,
          minWidth: 48,
          textAlign: 'center',
        },
        multiText: { fontSize: 15, color: muted },
        totalAmount: { fontSize: 18, fontWeight: '700', color: fg },
        addedConfirmation: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: addedBg,
          borderRadius: 12,
          padding: 14,
          marginTop: 20,
        },
        contactText: { fontSize: 14, fontWeight: '600', color: muted },
        qtyBtn: {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
        },
        contactBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 20,
          paddingVertical: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: border,
        },
        addToCartBtn: {
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
        },
        bottomBar: {}, // kept as empty fallback
        // BottomActionBar component handles the absolute positioning
      }) as const,
    [bg, fg, muted, surface, border, brand, addedBg],
  );

  const importeTotal = Number(precio) * cantidad;

  const handleAddToCart = useCallback(() => {
    if (stock <= 0) return;
    addItem({
      id_producto_semanal: productoSemanalId,
      producto: nombreProducto,
      unidad,
      precio: Number(precio),
      foto: null,
      agricultor: farmerName ?? '',
      stock,
    });
    setAdded(true);
    if (addedTimeoutRef.current) clearTimeout(addedTimeoutRef.current);
    addedTimeoutRef.current = setTimeout(() => setAdded(false), FEEDBACK_DURATION_MS);
  }, [addItem, productoSemanalId, nombreProducto, precio, stock, farmerName, unidad]);

  const handleIncrement = useCallback(() => {
    if (cantidad < stock) {
      setCantidad((c) => c + 1);
    }
  }, [cantidad, stock]);

  const handleDecrement = useCallback(() => {
    if (cantidad > 1) {
      setCantidad((c) => c - 1);
    }
  }, [cantidad]);

  return (
    <View style={dynamicStyles.screen}>
      {/* Header */}
      <View style={styles.headerTop}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <Text style={dynamicStyles.titleText}>{nombreProducto}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Product info */}
        <View style={dynamicStyles.productCard}>
          <Text style={dynamicStyles.priceText}>
            {formatPrice(precio)}
            <Text style={dynamicStyles.unitText}> / {unidad}</Text>
          </Text>

          <View style={dynamicStyles.farmerRow}>
            <View>
              <Text style={dynamicStyles.labelSmall}>Agricultor</Text>
              <Text style={dynamicStyles.valueSmall}>{farmerName}</Text>
            </View>
            <View>
              <Text style={dynamicStyles.labelSmall}>Stock</Text>
              <Text style={dynamicStyles.valueSmall}>
                {stock} {unidad}
              </Text>
            </View>
          </View>
        </View>

        {/* Quantity selector */}
        <Text style={dynamicStyles.sectionTitle}>Cantidad</Text>

        <View style={dynamicStyles.qtySelector}>
          <Pressable
            onPress={handleDecrement}
            disabled={cantidad <= 1}
            style={({ pressed }) => [
              dynamicStyles.qtyBtn,
              {
                backgroundColor:
                  cantidad <= 1
                    ? (isDark
                      ? colors.admInactiveBgD
                      : colors.admInactiveBgL)
                    : brand,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="minus"
              size={24}
              color={cantidad <= 1 ? muted : colors.iconWhite}
            />
          </Pressable>

          <Text style={dynamicStyles.qtyText}>{cantidad}</Text>

          <Pressable
            onPress={handleIncrement}
            disabled={cantidad >= stock}
            style={({ pressed }) => [
              dynamicStyles.qtyBtn,
              {
                backgroundColor:
                  cantidad >= stock
                    ? (isDark
                      ? colors.admInactiveBgD
                      : colors.admInactiveBgL)
                    : brand,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="plus"
              size={24}
              color={cantidad >= stock ? muted : colors.iconWhite}
            />
          </Pressable>
        </View>

        {/* Importe total */}
        <View style={styles.importeRow}>
          <Text style={dynamicStyles.multiText}>
            {cantidad} × {formatPrice(precio)}
          </Text>
          <Text style={dynamicStyles.totalAmount}>
            {formatPrice(String(importeTotal))}
          </Text>
        </View>

        {/* Added confirmation */}
        {added ? (
          <View style={dynamicStyles.addedConfirmation}>
            <MaterialCommunityIcons
              name="check-circle"
              size={22}
              color={colors.success}
            />
            <Text style={styles.addedText}>
              {cantidad} × {nombreProducto} agregado al carrito
            </Text>
          </View>
        ) : null}

        {/* Contact farmer */}
        <Pressable
          onPress={handleContactFarmer}
          disabled={createPrivateConversation.isPending}
          style={({ pressed }) => [
            dynamicStyles.contactBtn,
            { opacity: pressed || createPrivateConversation.isPending ? 0.6 : 1 },
          ]}
        >
          <MaterialCommunityIcons name="chat-outline" size={20} color={muted} />
          <Text style={dynamicStyles.contactText}>
            Contactar a {farmerName}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Bottom add to cart button */}
      <BottomActionBar>
        <Pressable
          onPress={handleAddToCart}
          disabled={stock <= 0}
          style={({ pressed }) => [
            dynamicStyles.addToCartBtn,
            {
              backgroundColor: stock <= 0 ? muted : brand,
              opacity: pressed && stock > 0 ? 0.8 : 1,
            },
          ]}
        >
          <Text style={styles.bottomBtnText}>
            {stock <= 0
              ? 'Sin stock disponible'
              : `Agregar al carrito — ${formatPrice(String(importeTotal))}`}
          </Text>
        </Pressable>
      </BottomActionBar>
    </View>
  );
}

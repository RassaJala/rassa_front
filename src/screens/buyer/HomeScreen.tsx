import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import {
  ProfileDrawerProvider,
  ProfileDrawerTrigger,
} from '@/components/ProfileDrawer';
import StatCard from '@/components/StatCard';
import { colors } from '@/constants/colors';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { usePublicacionesCurrent } from '@/hooks/usePublicacionesCurrent';
import type { ProductoSemanalPublic } from '@/services/publications';
import { useCartStore } from '@/store/cartStore';
import { useTheme } from '@/store/ThemeContext';
import type { BuyerTabsParamList } from '@/types';
import { formatPrice } from '@/utils/format';

const FAVORITE_INITIAL_VALUE = 8;
const SECTION_TOP_PADDING = 48;

const styles = StyleSheet.create({
  // ProductsContent
  loadingContainer: { paddingVertical: 40, alignItems: 'center' },
  errorContainer: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 32 },
  productsWrapper: { gap: 10 },

  // ProductCard
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  addToCartBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.iconWhite,
  },

  // HomeScreen
  scrollContent: { paddingBottom: 32 },
  headerWrapper: { paddingTop: SECTION_TOP_PADDING, paddingHorizontal: 20 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconRow: { flexDirection: 'row', gap: 10 },
  statsRow: { flexDirection: 'row', gap: 10, paddingVertical: 24 },
  productsSection: { paddingHorizontal: 20, marginTop: 8 },
  flexOne: { flex: 1 },
  listItemWrapper: { paddingHorizontal: 20 },
  itemSeparator: { height: 10 },
});

type Nav = BottomTabNavigationProp<BuyerTabsParamList>;

interface Props {
  readonly navigation: Nav;
}

export function flattenProductos(
  data:
    | readonly {
        readonly agricultor: {
          readonly id_usuario: number;
          readonly nombre: string;
          readonly apellido: string;
        };
        readonly productos: readonly ProductoSemanalPublic[];
      }[]
    | undefined,
): Array<{
  producto: ProductoSemanalPublic;
  farmerId: number;
  farmerName: string;
}> {
  const result: Array<{
    producto: ProductoSemanalPublic;
    farmerId: number;
    farmerName: string;
  }> = [];
  if (!data) {
    return result;
  }
  for (const pub of data) {
    const farmerId = pub.agricultor.id_usuario;
    const farmerName = `${pub.agricultor.nombre} ${pub.agricultor.apellido}`;
    for (const prod of pub.productos) {
      result.push({ producto: prod, farmerId, farmerName });
    }
  }
  return result;
}

interface ProductsContentProps {
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly allProductos: ReadonlyArray<{
    readonly producto: ProductoSemanalPublic;
    readonly farmerId: number;
    readonly farmerName: string;
  }>;
  readonly refetch: () => void;
  readonly handleProductPress: (
    producto: ProductoSemanalPublic,
    farmerId: number,
    farmerName: string,
  ) => void;
  readonly handleAddToCart: (producto: ProductoSemanalPublic) => void;
}

function ProductsContent({
  isLoading,
  isError,
  allProductos,
  refetch,
  handleProductPress,
  handleAddToCart,
}: ProductsContentProps): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;

  const pcStyles = useMemo(
    () =>
      ({
        errorText: { fontSize: 14, color: muted, textAlign: 'center' },
        retryBtn: {
          paddingHorizontal: 20,
          paddingVertical: 8,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: border,
        },
        retryBtnText: { fontSize: 13, fontWeight: '600', color: brand },
        emptyText: {
          fontSize: 14,
          color: muted,
          textAlign: 'center',
          marginTop: 8,
        },
      }) as const,
    [muted, border, brand],
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brand} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={40}
          color={muted}
        />
        <Text style={pcStyles.errorText}>
          No se pudieron cargar los productos
        </Text>
        <Pressable onPress={() => void refetch()} style={pcStyles.retryBtn}>
          <Text style={pcStyles.retryBtnText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (allProductos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="package-variant-closed"
          size={40}
          color={muted}
        />
        <Text style={pcStyles.emptyText}>
          No hay productos disponibles esta semana
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.productsWrapper}>
      {allProductos.map(({ producto, farmerId, farmerName }) => (
        <ProductCard
          key={producto.id_producto_semanal}
          producto={producto}
          farmerId={farmerId}
          farmerName={farmerName}
          handleProductPress={handleProductPress}
          handleAddToCart={handleAddToCart}
        />
      ))}
    </View>
  );
}

interface ProductCardProps {
  readonly producto: ProductoSemanalPublic;
  readonly farmerId: number;
  readonly farmerName: string;
  readonly handleProductPress: (
    producto: ProductoSemanalPublic,
    farmerId: number,
    farmerName: string,
  ) => void;
  readonly handleAddToCart: (producto: ProductoSemanalPublic) => void;
}

function ProductCard({
  producto,
  farmerId,
  farmerName,
  handleProductPress,
  handleAddToCart,
}: ProductCardProps): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const cartItems = useCartStore((s) => s.items);
  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;

  const cardStyles = useMemo(
    () =>
      ({
        productName: { fontSize: 16, fontWeight: '600', color: fg },
        farmerLine: { fontSize: 13, color: muted, marginTop: 2 },
        stockLine: { fontSize: 13, color: muted, marginTop: 1 },
        price: { fontSize: 18, fontWeight: '700', color: brand },
        card: {
          backgroundColor: surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: border,
          padding: 14,
        },
        addBtn: {
          borderRadius: 10,
          paddingVertical: 10,
          alignItems: 'center',
          marginTop: 10,
        },
      }) as const,
    [fg, muted, brand, surface, border],
  );

  const inCart = cartItems.some(
    (i) => i.id_producto_semanal === producto.id_producto_semanal,
  );
  const cartQuantity = cartItems.find(
    (i) => i.id_producto_semanal === producto.id_producto_semanal,
  )?.cantidad;

  return (
    <Pressable
      onPress={() => handleProductPress(producto, farmerId, farmerName)}
      style={({ pressed }) => [cardStyles.card, { opacity: pressed ? 0.9 : 1 }]}
    >
      <View style={styles.cardRow}>
        <View style={styles.flexOne}>
          <Text style={cardStyles.productName}>{producto.producto}</Text>
          <Text style={cardStyles.farmerLine}>
            {farmerName} · {producto.unidad}
          </Text>
          <Text style={cardStyles.stockLine}>
            Stock: {producto.stock} {producto.unidad}
          </Text>
        </View>
        <Text style={cardStyles.price}>{formatPrice(producto.precio)}</Text>
      </View>

      <Pressable
        onPress={() => handleAddToCart(producto)}
        disabled={inCart}
        style={({ pressed }) => [
          cardStyles.addBtn,
          {
            backgroundColor: inCart ? muted : brand,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Text style={styles.addToCartBtnText}>
          {inCart ? `En carrito (${cartQuantity ?? 0})` : 'Agregar al carrito'}
        </Text>
      </Pressable>
    </Pressable>
  );
}

export default function HomeScreen({ navigation }: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);

  const {
    data: currentPubRes,
    isLoading,
    isError,
    refetch,
  } = usePublicacionesCurrent();

  // Extract all products from all publications
  const allProductos = useMemo(
    () => flattenProductos(currentPubRes?.data),
    [currentPubRes?.data],
  );

  const handleProfilePress = useCallback(() => {
    navigation.getParent()?.navigate('Profile');
  }, [navigation]);

  const handleProductPress = useCallback(
    (producto: ProductoSemanalPublic, farmerId: number, farmerName: string) => {
      navigation.getParent()?.navigate('ProductDetail', {
        productoSemanalId: producto.id_producto_semanal,
        farmerId,
        farmerName,
        nombreProducto: producto.producto,
        precio: producto.precio,
        stock: producto.stock,
        unidad: producto.unidad,
        foto: producto.foto,
      });
    },
    [navigation],
  );

  const handleAddToCart = useCallback(
    (producto: ProductoSemanalPublic) => {
      const entry = allProductos.find(
        (p) => p.producto.id_producto_semanal === producto.id_producto_semanal,
      );
      addItem({
        id_producto_semanal: producto.id_producto_semanal,
        producto: producto.producto,
        unidad: producto.unidad,
        precio: Number(producto.precio),
        foto: producto.foto,
        agricultor: entry?.farmerName ?? '',
        stock: producto.stock,
      });
    },
    [addItem, allProductos],
  );

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const accentBg = isDark ? colors.admActiveBgD : colors.admActiveBgL;
  const coralBg = isDark ? colors.admCoralBgD : colors.admCoralBgL;
  const pumpkinBg = isDark ? colors.admPumpkinBgD : colors.admPumpkinBgL;
  const coral = colors.brandRedCoral;
  const pumpkin = colors.accent;

  const { today } = useFormattedDate();

  const hsStyles = useMemo(
    () =>
      ({
        screen: { flex: 1, backgroundColor: bg },
        dateText: {
          fontSize: 14,
          fontWeight: '600',
          letterSpacing: 0.06,
          textTransform: 'uppercase',
          color: muted,
        },
        titleText: {
          fontSize: 32,
          fontWeight: '700',
          letterSpacing: -0.3,
          color: fg,
        },
        sectionTitle: {
          fontSize: 20,
          fontWeight: '700',
          color: fg,
          marginBottom: 4,
        },
        sectionSubtitle: { fontSize: 13, color: muted, marginBottom: 16 },
        notifBtn: {
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: surface,
          borderWidth: 1,
          borderColor: border,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }) as const,
    [bg, fg, muted, surface, border],
  );

  const renderHeader = (
    <>
      {/* Header */}
      <View style={styles.headerWrapper}>
        <View style={styles.headerRow}>
          <View>
            <Text style={hsStyles.dateText}>{today}</Text>
            <Text style={hsStyles.titleText}>Inicio</Text>
          </View>
          <View style={styles.iconRow}>
            <Pressable
              style={({ pressed }) => [
                hsStyles.notifBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <MaterialCommunityIcons
                name="bell-outline"
                size={24}
                color={fg}
              />
            </Pressable>
            <ProfileDrawerTrigger />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard
            icon="package-variant"
            value={allProductos.length.toLocaleString()}
            label="Productos"
            iconBg={accentBg}
            iconColor={brand}
          />
          <StatCard
            icon="heart-outline"
            value={FAVORITE_INITIAL_VALUE}
            label="Favoritos"
            iconBg={coralBg}
            iconColor={coral}
          />
          <Pressable
            onPress={() => navigation.navigate('Pedidos')}
            style={styles.flexOne}
          >
            <StatCard
              icon="truck-outline"
              value={cartItems.length}
              label="Carrito"
              iconBg={pumpkinBg}
              iconColor={pumpkin}
            />
          </Pressable>
        </View>
      </View>

      {/* Products section */}
      <View style={styles.productsSection}>
        <Text style={hsStyles.sectionTitle}>Productos disponibles</Text>
        <Text style={hsStyles.sectionSubtitle}>Esta semana en tu mercado</Text>
      </View>
    </>
  );

  return (
    <ProfileDrawerProvider
      defaultName="Cliente"
      defaultEmail="cliente@rassa.com"
      onProfilePress={handleProfilePress}
    >
      <View style={hsStyles.screen}>
        <FlatList
          ListHeaderComponent={renderHeader}
          data={allProductos}
          renderItem={({ item }) => (
            <View style={styles.listItemWrapper}>
              <ProductCard
                producto={item.producto}
                farmerId={item.farmerId}
                farmerName={item.farmerName}
                handleProductPress={handleProductPress}
                handleAddToCart={handleAddToCart}
              />
            </View>
          )}
          keyExtractor={(item) => String(item.producto.id_producto_semanal)}
          ListEmptyComponent={
            <ProductsContent
              isLoading={isLoading}
              isError={isError}
              allProductos={allProductos}
              refetch={refetch}
              handleProductPress={handleProductPress}
              handleAddToCart={handleAddToCart}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        />
      </View>
    </ProfileDrawerProvider>
  );
}

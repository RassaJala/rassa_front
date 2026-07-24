import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { mediaUrl } from '@/services/api';
import type { CatalogProduct } from '@/services/catalog';
import { useTheme } from '@/store/ThemeContext';

interface Props {
  producto: CatalogProduct;
  agricultor?: string;
  onAddToCart: (producto: CatalogProduct) => void;
}

export default function ProductCard({
  producto,
  agricultor,
  onAddToCart,
}: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;

  const imageUri = mediaUrl(producto.foto);
  const precio = Number(producto.precio);

  return (
    <View
      className="overflow-hidden rounded-2xl"
      style={{
        backgroundColor: surface,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      {/* Image */}
      <View
        className="h-40 w-full items-center justify-center"
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- colors is a plain object with string values
        style={{ backgroundColor: isDark ? colors.admBgD : colors.admBgL }}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <MaterialCommunityIcons
            name="image-outline"
            size={48}
            color={muted}
          />
        )}
      </View>

      {/* Info */}
      <View className="p-3">
        <Text
          className="text-base font-bold"
          style={{ color: fg }}
          numberOfLines={1}
        >
          {producto.producto}
        </Text>

        <Text className="mt-1 text-lg font-bold" style={{ color: brand }}>
          ${precio.toFixed(2)}/{producto.unidad}
        </Text>

        <View className="mt-1 flex-row items-center gap-1">
          <Text style={{ fontSize: 12, color: muted }}>Stock:</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: fg }}>
            {producto.stock}
          </Text>
          <Text style={{ fontSize: 11, color: muted }}>
            {producto.unidad} disponibles
          </Text>
        </View>

        {agricultor ? (
          <Text className="mt-1 text-xs" style={{ color: muted }}>
            🌱 {agricultor}
          </Text>
        ) : null}

        {/* Add to cart */}
        <Pressable
          onPress={() => onAddToCart(producto)}
          disabled={producto.stock === 0}
          className="mt-3 flex-row items-center justify-center gap-2 rounded-xl py-2.5"
          style={{
            backgroundColor: producto.stock === 0 ? muted : brand,
            opacity: producto.stock === 0 ? 0.5 : 1,
          }}
        >
          <MaterialCommunityIcons
            name="cart-plus"
            size={18}
            color={colors.iconWhite}
          />
          <Text
            className="text-sm font-semibold"
            style={{ color: colors.iconWhite }}
          >
            {producto.stock === 0 ? 'Sin stock' : 'Agregar'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

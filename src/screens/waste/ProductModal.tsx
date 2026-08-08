import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { ThemeColors } from '@/constants/colors';
import { colors } from '@/constants/colors';
import type { PublishedProduct } from '@/types/waste';

interface ProductModalProps {
  readonly visible: boolean;
  readonly loading: boolean;
  readonly products: readonly PublishedProduct[];
  readonly selectedId: number | null;
  readonly bottomInset: number;
  readonly t: ThemeColors;
  readonly onClose: () => void;
  readonly onSelect: (product: PublishedProduct) => void;
}

function productModalHint(loading: boolean, productCount: number): string {
  if (loading) return 'Cargando productos…';
  if (productCount === 0) return 'No hay productos disponibles.';
  return 'Elige un producto publicado…';
}

export function ProductModal({
  visible,
  loading,
  products,
  selectedId,
  bottomInset,
  t,
  onClose,
  onSelect,
}: ProductModalProps): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: colors.modalOverlayBg,
        }}
      >
        <View
          style={{
            backgroundColor: t.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: bottomInset + 16,
            maxHeight: '70%',
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: t.border,
              }}
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: 16,
                fontWeight: '700',
                color: t.fg,
                marginRight: 12,
              }}
            >
              Producto publicado
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.input,
                borderWidth: 1,
                borderColor: t.border,
              }}
              accessibilityLabel="Cerrar selector de producto"
            >
              <MaterialCommunityIcons name="close" size={18} color={t.fg} />
            </Pressable>
          </View>
          <Text
            style={{
              fontSize: 13,
              color: t.muted,
              marginBottom: 12,
            }}
          >
            {productModalHint(loading, products.length)}
          </Text>
          {loading ? (
            <ActivityIndicator color={t.brand} style={{ marginVertical: 24 }} />
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => String(item.id_producto_semanal)}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = item.id_producto_semanal === selectedId;
                return (
                  <Pressable
                    onPress={() => onSelect(item)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      backgroundColor: isSelected ? t.input : t.surface,
                      borderWidth: 1,
                      borderColor: isSelected ? t.brand : t.border,
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: t.fg,
                        }}
                      >
                        {item.producto}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: t.muted,
                          marginTop: 2,
                        }}
                      >
                        Unidad: {item.unidad}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: t.brand,
                        }}
                      >
                        ${item.precio}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: t.muted,
                          marginTop: 2,
                        }}
                      >
                        Stock: {item.stock}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

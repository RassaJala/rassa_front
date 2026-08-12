import React from 'react';
import { Text, View } from 'react-native';

import { BottomSheetListModal } from '@/components/ui';
import type { ThemeColors } from '@/constants/colors';
import type { PublishedProduct } from '@/types/waste';

function productModalHint(productCount: number): string {
  if (productCount === 0) return 'No hay productos disponibles.';
  return 'Elige un producto publicado…';
}

interface ProductModalProps {
  readonly visible: boolean;
  readonly products: readonly PublishedProduct[];
  readonly selectedId: number | null;
  readonly bottomInset: number;
  readonly t: ThemeColors;
  readonly onClose: () => void;
  readonly onSelect: (product: PublishedProduct) => void;
}

export function ProductModal({
  visible,
  products,
  selectedId,
  bottomInset,
  t,
  onClose,
  onSelect,
}: ProductModalProps): React.JSX.Element {
  return (
    <BottomSheetListModal
      visible={visible}
      title="Producto publicado"
      hint={productModalHint(products.length)}
      closeLabel="Cerrar selector de producto"
      items={products}
      keyExtractor={(item) => String(item.id_producto_semanal)}
      isSelected={(item) => item.id_producto_semanal === selectedId}
      bottomInset={bottomInset}
      t={t}
      onClose={onClose}
      onSelect={onSelect}
      renderRowContent={(item) => (
        <>
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
        </>
      )}
    />
  );
}

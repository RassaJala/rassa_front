import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';

interface Props {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSelect: (id: number | undefined) => void;
  readonly selectedId: number | undefined;
  readonly products: { id: number; nombre: string }[];
  readonly surface: string;
  readonly fg: string;
  readonly muted: string;
  readonly brand: string;
  readonly bg: string;
}

export function MermaProductPickerModal({
  visible,
  onClose,
  onSelect,
  selectedId,
  products,
  surface,
  fg,
  muted,
  brand,
  bg,
}: Props): React.JSX.Element {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) setSearch('');
  }, [visible]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase().trim();
    return products.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [products, search]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: 24,
          backgroundColor: colors.modalOverlayBg,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: surface,
            borderRadius: 16,
            maxHeight: '80%',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: fg }}>
              Seleccionar producto
            </Text>
          </View>

          <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: bg,
                borderRadius: 10,
                paddingHorizontal: 12,
              }}
            >
              <MaterialCommunityIcons name="magnify" size={18} color={muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar producto..."
                placeholderTextColor={muted}
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: fg,
                  paddingVertical: 10,
                  paddingLeft: 8,
                }}
              />
            </View>
          </View>

          <FlatList
            data={[{ id: -1, nombre: 'Todos los productos' }, ...filtered]}
            keyExtractor={(item) => String(item.id)}
            style={{ maxHeight: 350 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            renderItem={({ item }) => {
              const isSelected =
                item.id === selectedId ||
                (item.id === -1 && selectedId === undefined);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    onSelect(item.id === -1 ? undefined : item.id);
                    onClose();
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: isSelected ? brand : colors.transparent,
                    marginHorizontal: 8,
                    borderRadius: 10,
                    marginVertical: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: isSelected ? colors.iconWhite : fg,
                    }}
                  >
                    {item.nombre}
                  </Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: muted, fontSize: 14 }}>
                  Sin resultados
                </Text>
              </View>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

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
import type { FarmerOption } from '@/services/settlements';

import type { AdminPalette } from '../merma/colors';

interface Props {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSelect: (id: number | undefined) => void;
  readonly selectedId: number | undefined;
  readonly farmers: FarmerOption[];
  readonly isError?: boolean;
  readonly onRetry?: () => void;
  readonly palette: AdminPalette;
}

export function FarmerPickerModal({
  visible,
  onClose,
  onSelect,
  selectedId,
  farmers,
  isError = false,
  onRetry,
  palette,
}: Props): React.JSX.Element {
  const { surface, fg, muted, brand, bg } = palette;
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) setSearch('');
  }, [visible]);

  const filtered = useMemo(() => {
    if (!search.trim()) return farmers;
    const q = search.toLowerCase().trim();
    return farmers.filter((f) => f.nombre.toLowerCase().includes(q));
  }, [farmers, search]);

  // When the fetch failed and there is nothing to show, drop even the
  // "Todos los agricultores" option so the ListEmptyComponent renders the
  // error block with a retry action instead of a misleading list.
  const options = useMemo(() => {
    if (isError && farmers.length === 0) return [];
    return [{ id_usuario: -1, nombre: 'Todos los agricultores' }, ...filtered];
  }, [filtered, isError, farmers.length]);

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
          testID="farmer-picker-modal"
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
              Seleccionar agricultor
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
                placeholder="Buscar agricultor..."
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
            data={options}
            keyExtractor={(item) => String(item.id_usuario)}
            style={{ maxHeight: 350 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            renderItem={({ item }) => {
              const isSelected =
                item.id_usuario === selectedId ||
                (item.id_usuario === -1 && selectedId === undefined);
              return (
                <Pressable
                  key={item.id_usuario}
                  onPress={() => {
                    onSelect(
                      item.id_usuario === -1 ? undefined : item.id_usuario,
                    );
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
              isError && farmers.length === 0 ? (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <Text style={{ color: muted, fontSize: 14 }}>
                    No se pudieron cargar los agricultores
                  </Text>
                  <Pressable
                    onPress={onRetry}
                    testID="farmer-picker-retry"
                    style={{
                      marginTop: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: brand,
                    }}
                  >
                    <Text
                      style={{ color: brand, fontSize: 14, fontWeight: '600' }}
                    >
                      Reintentar
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <Text style={{ color: muted, fontSize: 14 }}>
                    Sin resultados
                  </Text>
                </View>
              )
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

import React from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { ThemeColors } from '@/constants/colors';
import { colors } from '@/constants/colors';
import type { WasteDecisionOption } from '@/types/waste';

interface DecisionModalProps {
  readonly visible: boolean;
  readonly options: readonly WasteDecisionOption[];
  readonly selectedId: number | null;
  readonly bottomInset: number;
  readonly t: ThemeColors;
  readonly onClose: () => void;
  readonly onSelect: (option: WasteDecisionOption) => void;
}

export function DecisionModal({
  visible,
  options,
  selectedId,
  bottomInset,
  t,
  onClose,
  onSelect,
}: DecisionModalProps): React.JSX.Element {
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
            maxHeight: '60%',
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
              Seleccionar decisión
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
              accessibilityLabel="Cerrar selector de decisión"
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
            Elige qué hacer con el producto.
          </Text>
          <FlatList
            data={options}
            keyExtractor={(item) => String(item.id_decision)}
            showsVerticalScrollIndicator={false}
            style={{ flexShrink: 1 }}
            renderItem={({ item }) => {
              const isSelected = item.id_decision === selectedId;
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
                  <Text
                    style={{
                      flex: 1,
                      marginRight: 12,
                      fontSize: 14,
                      fontWeight: '600',
                      color: t.fg,
                    }}
                  >
                    {item.decision}
                  </Text>
                  {isSelected ? (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={t.brand}
                    />
                  ) : null}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

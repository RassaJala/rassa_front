import React from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { ThemeColors } from '@/constants/colors';
import { colors } from '@/constants/colors';

interface BottomSheetListModalProps<T> {
  readonly visible: boolean;
  readonly title: string;
  readonly hint: string;
  readonly closeLabel: string;
  readonly items: readonly T[];
  readonly keyExtractor: (item: T) => string;
  readonly isSelected: (item: T) => boolean;
  readonly bottomInset: number;
  readonly maxHeight?: '60%' | '70%';
  readonly t: ThemeColors;
  readonly onClose: () => void;
  readonly onSelect: (item: T) => void;
  readonly renderRowContent: (
    item: T,
    isSelected: boolean,
    t: ThemeColors,
  ) => React.JSX.Element;
}

export function BottomSheetListModal<T>({
  visible,
  title,
  hint,
  closeLabel,
  items,
  keyExtractor,
  isSelected,
  bottomInset,
  maxHeight = '70%',
  t,
  onClose,
  onSelect,
  renderRowContent,
}: BottomSheetListModalProps<T>): React.JSX.Element {
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
            maxHeight,
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
              {title}
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
              accessibilityLabel={closeLabel}
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
            {hint}
          </Text>
          <FlatList
            data={items}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            style={{ flexShrink: 1 }}
            renderItem={({ item }) => {
              const rowSelected = isSelected(item);
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
                    backgroundColor: rowSelected ? t.input : t.surface,
                    borderWidth: 1,
                    borderColor: rowSelected ? t.brand : t.border,
                    marginBottom: 8,
                  }}
                >
                  {renderRowContent(item, rowSelected, t)}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

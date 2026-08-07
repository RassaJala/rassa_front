import React from 'react';
import type { ReactNode } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import type { DimensionValue } from 'react-native';

import { OVERLAY_RGBA } from './utils';

interface BottomSheetModalProps {
  readonly title: string;
  readonly maxHeight: DimensionValue;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly fg: string;
  readonly redCoral: string;
  readonly surface: string;
}

export default function BottomSheetModal({
  title,
  maxHeight,
  onClose,
  children,
  fg,
  redCoral,
  surface,
}: BottomSheetModalProps): React.JSX.Element {
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: OVERLAY_RGBA,
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: surface,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 20,
            maxHeight,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: fg }}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text
                style={{ fontSize: 15, fontWeight: '600', color: redCoral }}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

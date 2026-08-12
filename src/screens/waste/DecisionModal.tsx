import React from 'react';
import { Text } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { BottomSheetListModal } from '@/components/ui';
import type { ThemeColors } from '@/constants/colors';
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
    <BottomSheetListModal
      visible={visible}
      title="Seleccionar decisión"
      hint="Elige qué hacer con el producto."
      closeLabel="Cerrar selector de decisión"
      items={options}
      keyExtractor={(item) => String(item.id_decision)}
      isSelected={(item) => item.id_decision === selectedId}
      bottomInset={bottomInset}
      maxHeight="60%"
      t={t}
      onClose={onClose}
      onSelect={onSelect}
      renderRowContent={(item, isSelected) => (
        <>
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
        </>
      )}
    />
  );
}

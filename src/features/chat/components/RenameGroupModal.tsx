import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Modal, Portal, TextInput } from 'react-native-paper';

interface RenameGroupModalProps {
  visible: boolean;
  currentName: string;
  onDismiss: () => void;
  onSave: (name: string) => void;
  saving: boolean;
}

// ponytail: Paper Modal requires inline style object for contentContainerStyle
const MODAL_STYLE = {
  margin: 24,
  borderRadius: 16,
  backgroundColor: '#FFFFFF',
  padding: 24,
} as const;

export default function RenameGroupModal({
  visible,
  currentName,
  onDismiss,
  onSave,
  saving,
}: Readonly<RenameGroupModalProps>): React.JSX.Element {
  const [name, setName] = useState(currentName);

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== currentName) {
      onSave(trimmed);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={MODAL_STYLE}
      >
        <Text className="mb-4 text-lg font-bold text-gray-900">
          Renombrar grupo
        </Text>
        <TextInput
          label="Nombre del grupo"
          value={name}
          onChangeText={setName}
          mode="outlined"
        />
        <View className="mt-4 flex-row justify-end gap-4">
          <Pressable onPress={onDismiss}>
            <Text className="text-sm text-gray-500">Cancelar</Text>
          </Pressable>
          <Pressable onPress={handleSave} disabled={saving}>
            <Text
              className={`text-sm font-medium ${saving ? 'text-gray-400' : 'text-green-600'}`}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </Text>
          </Pressable>
        </View>
      </Modal>
    </Portal>
  );
}

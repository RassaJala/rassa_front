import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Modal, Portal, TextInput } from 'react-native-paper';

import { colors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';

interface RenameGroupModalProps {
  visible: boolean;
  currentName: string;
  onDismiss: () => void;
  onSave: (name: string) => void;
  saving: boolean;
}

export default function RenameGroupModal({
  visible,
  currentName,
  onDismiss,
  onSave,
  saving,
}: Readonly<RenameGroupModalProps>): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const [name, setName] = useState(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

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
        contentContainerStyle={{
          margin: 24,
          borderRadius: 16,
          backgroundColor: isDark ? colors.admSurfaceD : colors.admSurfaceL,
          padding: 24,
        }}
      >
        <Text className="mb-4 text-lg font-bold text-rassa-fg dark:text-rassa-fg-dark">
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
            <Text className="text-sm text-rassa-muted dark:text-rassa-muted-dark">
              Cancelar
            </Text>
          </Pressable>
          <Pressable onPress={handleSave} disabled={saving}>
            <Text
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                saving
                  ? 'bg-rassa-border text-rassa-muted dark:bg-rassa-border-dark dark:text-rassa-muted-dark'
                  : 'bg-rassa-brand text-white dark:bg-rassa-brand-dark'
              }`}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </Text>
          </Pressable>
        </View>
      </Modal>
    </Portal>
  );
}

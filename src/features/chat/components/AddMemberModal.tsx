import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Modal, Portal, TextInput } from 'react-native-paper';

import { colors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';

interface AddMemberModalProps {
  visible: boolean;
  onDismiss: () => void;
  onAdd: (userId: number) => void;
  adding: boolean;
}

export default function AddMemberModal({
  visible,
  onDismiss,
  onAdd,
  adding,
}: Readonly<AddMemberModalProps>): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const [userIdText, setUserIdText] = useState('');

  const handleAdd = () => {
    const userId = Number(userIdText);
    if (!Number.isNaN(userId) && userId > 0) {
      onAdd(userId);
      setUserIdText('');
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
          backgroundColor: isDark ? colors.brandInk : colors.surface,
          padding: 24,
        }}
      >
        <Text className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
          Agregar integrante
        </Text>
        <TextInput
          label="ID del usuario"
          value={userIdText}
          onChangeText={setUserIdText}
          keyboardType="numeric"
          mode="outlined"
        />
        <View className="mt-4 flex-row justify-end gap-4">
          <Pressable onPress={onDismiss}>
            <Text className="text-sm text-gray-500">Cancelar</Text>
          </Pressable>
          <Pressable onPress={handleAdd} disabled={adding}>
            <Text
              className={`text-sm font-medium ${adding ? 'text-gray-400' : 'text-green-600'}`}
            >
              {adding ? 'Agregando...' : 'Agregar'}
            </Text>
          </Pressable>
        </View>
      </Modal>
    </Portal>
  );
}

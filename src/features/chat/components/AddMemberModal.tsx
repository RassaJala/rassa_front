import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Modal, Portal } from 'react-native-paper';

import { colors } from '@/constants/colors';
import ChatUserSearchPicker from '@/features/chat/components/ChatUserSearchPicker';
import { useTheme } from '@/store/ThemeContext';
import type { SearchUser } from '@/types/chat';

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
  const [selected, setSelected] = useState<SearchUser[]>([]);

  const handleToggle = (user: SearchUser) => {
    setSelected((prev) =>
      prev.some((s) => s.idUsuario === user.idUsuario) ? [] : [user],
    );
  };

  const handleAdd = () => {
    const user = selected[0];
    if (!user) return;
    onAdd(user.idUsuario);
    setSelected([]);
  };

  const handleDismiss = () => {
    setSelected([]);
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
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
        <ChatUserSearchPicker
          selected={selected}
          onToggle={handleToggle}
          placeholder="Buscar por nombre o correo..."
        />
        <View className="mt-4 flex-row justify-end gap-4">
          <Pressable onPress={handleDismiss}>
            <Text className="text-sm text-gray-500">Cancelar</Text>
          </Pressable>
          <Pressable
            onPress={handleAdd}
            disabled={adding || selected.length === 0}
          >
            <Text
              className={`text-sm font-medium ${adding || selected.length === 0 ? 'text-gray-400' : 'text-green-600'}`}
            >
              {adding ? 'Agregando...' : 'Agregar'}
            </Text>
          </Pressable>
        </View>
      </Modal>
    </Portal>
  );
}

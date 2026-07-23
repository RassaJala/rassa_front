import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';

import { useCreateGroup } from '@/features/chat/hooks/useCreateGroup';

export default function CreateGroupScreen(): React.JSX.Element {
  const [name, setName] = useState('');
  const [membersText, setMembersText] = useState('');
  const createGroupMutation = useCreateGroup();

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const memberIds = membersText
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((id) => !Number.isNaN(id) && id > 0);

    if (memberIds.length === 0) return;

    createGroupMutation.mutate({
      nombre: trimmed,
      fk_usuarios: memberIds,
    });
  };

  const isValid = name.trim().length > 0 && membersText.trim().length > 0;

  return (
    <View className="flex-1 bg-gray-50 p-4 dark:bg-gray-950">
      <Text className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">
        Crear grupo
      </Text>

      <TextInput
        label="Nombre del grupo"
        value={name}
        onChangeText={setName}
        mode="outlined"
        className="mb-4"
      />

      <TextInput
        label="IDs de miembros (separados por coma)"
        value={membersText}
        onChangeText={setMembersText}
        mode="outlined"
        keyboardType="numeric"
        className="mb-4"
      />

      <Text className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        Ingresa los IDs de los usuarios que quieres agregar al grupo, separados
        por comas. Ejemplo: 1, 2, 3
      </Text>

      <Button
        mode="contained"
        onPress={handleCreate}
        disabled={!isValid || createGroupMutation.isPending}
        loading={createGroupMutation.isPending}
      >
        Crear grupo
      </Button>
    </View>
  );
}

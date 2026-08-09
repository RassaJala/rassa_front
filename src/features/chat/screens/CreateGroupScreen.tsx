import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';

import ChatUserSearchPicker from '@/features/chat/components/ChatUserSearchPicker';
import { useCreateGroup } from '@/features/chat/hooks/useCreateGroup';
import type { SearchUser } from '@/types/chat';

export default function CreateGroupScreen(): React.JSX.Element {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<SearchUser[]>([]);
  const createGroupMutation = useCreateGroup();

  const handleToggle = (user: SearchUser) => {
    setSelected((prev) =>
      prev.some((s) => s.idUsuario === user.idUsuario)
        ? prev.filter((s) => s.idUsuario !== user.idUsuario)
        : [...prev, user],
    );
  };

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed || selected.length === 0) return;

    createGroupMutation.mutate({
      nombre: trimmed,
      fk_usuarios: selected.map((u) => u.idUsuario),
    });
  };

  const isValid = name.trim().length > 0 && selected.length > 0;

  return (
    <ScrollView
      className="flex-1 bg-rassa-bg dark:bg-rassa-bg-dark"
      contentContainerStyle={{ padding: 16 }}
    >
      <Text className="mb-4 text-lg font-bold text-rassa-fg dark:text-rassa-fg-dark">
        Crear grupo
      </Text>

      <TextInput
        label="Nombre del grupo"
        value={name}
        onChangeText={setName}
        mode="outlined"
        accessibilityLabel="Nombre del grupo"
        className="mb-4"
      />

      <Text className="mb-2 text-sm font-medium text-rassa-fg dark:text-rassa-fg-dark">
        Agregar integrantes
      </Text>

      <ChatUserSearchPicker
        selected={selected}
        onToggle={handleToggle}
        placeholder="Buscar por nombre o correo..."
      />

      <View className="mt-2 mb-4">
        <Text className="text-xs text-rassa-muted dark:text-rassa-muted-dark">
          {selected.length > 0
            ? `${selected.length} integrante(s) seleccionado(s)`
            : 'Busca usuarios por nombre o correo para agregarlos al grupo.'}
        </Text>
      </View>

      <Button
        mode="contained"
        onPress={handleCreate}
        disabled={!isValid || createGroupMutation.isPending}
        loading={createGroupMutation.isPending}
        testID="crear-grupo-button"
      >
        Crear grupo
      </Button>
    </ScrollView>
  );
}

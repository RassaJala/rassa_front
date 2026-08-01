import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { TextInput } from 'react-native-paper';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { useChatUserSearch } from '@/features/chat/hooks/useChatUserSearch';
import { useTheme } from '@/store/ThemeContext';
import type { SearchUser } from '@/types/chat';

interface ChatUserSearchPickerProps {
  selected: SearchUser[];
  onToggle: (user: SearchUser) => void;
  placeholder?: string;
}

export default function ChatUserSearchPicker({
  selected,
  onToggle,
  placeholder = 'Buscar por nombre o correo...',
}: Readonly<ChatUserSearchPickerProps>): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const [query, setQuery] = useState('');
  const { results, isSearching, error } = useChatUserSearch(query);

  const filtered = results.filter(
    (user) => !selected.some((s) => s.idUsuario === user.idUsuario),
  );
  const showDropdown = query.trim().length >= 3;

  const handlePick = (user: SearchUser) => {
    onToggle(user);
    setQuery('');
  };

  return (
    <View>
      {selected.length > 0 ? (
        <View className="mb-2 flex-row flex-wrap gap-2">
          {selected.map((user) => (
            <Pressable
              key={user.idUsuario}
              onPress={() => onToggle(user)}
              accessibilityLabel={`Quitar ${user.nombreCompleto}`}
            >
              <View className="flex-row items-center gap-1 rounded-full border border-rassa-active-bg bg-rassa-active-bg px-3 py-1.5 dark:border-rassa-active-bg-dark dark:bg-rassa-active-bg-dark">
                <Text className="text-sm text-rassa-fg dark:text-rassa-fg-dark">
                  {user.nombreCompleto}
                </Text>
                <MaterialCommunityIcons
                  name="close"
                  size={14}
                  color={isDark ? colors.admMutedD : colors.admMutedL}
                />
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        mode="outlined"
        dense
        accessibilityLabel="Buscar usuario"
      />

      {showDropdown ? (
        <ScrollView
          className="mt-1 max-h-48 rounded-lg border border-rassa-border dark:border-rassa-border-dark"
          keyboardShouldPersistTaps="handled"
        >
          {isSearching ? (
            <Text className="px-3 py-2 text-sm text-rassa-muted dark:text-rassa-muted-dark">
              Buscando…
            </Text>
          ) : null}
          {!isSearching && error ? (
            <Text className="px-3 py-2 text-sm text-rassa-error">{error}</Text>
          ) : null}
          {!isSearching && !error && filtered.length === 0 ? (
            <Text className="px-3 py-2 text-sm text-rassa-muted dark:text-rassa-muted-dark">
              Sin resultados
            </Text>
          ) : null}
          {filtered.map((user) => (
            <Pressable
              key={user.idUsuario}
              onPress={() => handlePick(user)}
              accessibilityLabel={`Seleccionar ${user.nombreCompleto}`}
              className="px-3 py-2"
            >
              <Text className="text-sm font-medium text-rassa-fg dark:text-rassa-fg-dark">
                {user.nombreCompleto}
              </Text>
              <Text className="text-xs text-rassa-muted dark:text-rassa-muted-dark">
                {user.correo} · {user.rol}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

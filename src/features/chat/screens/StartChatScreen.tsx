import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from 'react-native-paper';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ChatUserSearchPicker from '@/features/chat/components/ChatUserSearchPicker';
import { useCreatePrivateConversation } from '@/features/chat/hooks/useCreatePrivateConversation';
import { useAuth } from '@/store/AuthContext';
import type { ChatStackParamList, SearchUser } from '@/types/chat';

type NavigationProp = NativeStackNavigationProp<ChatStackParamList>;

export default function StartChatScreen(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const createPrivateChat = useCreatePrivateConversation();

  const [isPrivate, setIsPrivate] = useState(false);
  const [selected, setSelected] = useState<SearchUser[]>([]);

  const currentUser = selected[0] ?? null;
  const isSelfChat =
    currentUser !== null &&
    user?.id !== undefined &&
    currentUser.idUsuario === user.id;
  const isValid = currentUser !== null && !isSelfChat;

  const handleToggle = (searchUser: SearchUser) => {
    setSelected((prev) =>
      prev.some((s) => s.idUsuario === searchUser.idUsuario)
        ? []
        : [searchUser],
    );
  };

  const handlePrivateChat = () => {
    if (!currentUser || isSelfChat || createPrivateChat.isPending) return;

    createPrivateChat.mutate({ fk_usuario: currentUser.idUsuario });
  };

  return (
    <View className="flex-1 bg-gray-50 p-4 dark:bg-gray-950">
      {!isPrivate ? (
        <View className="gap-4">
          <Text className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-100">
            Iniciar conversación
          </Text>

          <Button
            mode="outlined"
            icon="account"
            onPress={() => setIsPrivate(true)}
            accessibilityLabel="Chat privado"
          >
            Chat privado
          </Button>

          <Button
            mode="outlined"
            icon="account-group"
            onPress={() => navigation.navigate('CreateGroup')}
            accessibilityLabel="Nuevo grupo"
          >
            Nuevo grupo
          </Button>
        </View>
      ) : (
        <View className="gap-4">
          <Text className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-100">
            Chat privado
          </Text>

          <ChatUserSearchPicker
            selected={selected}
            onToggle={handleToggle}
            placeholder="Buscar por nombre o correo..."
          />

          {isSelfChat ? (
            <Text className="text-sm text-red-500">
              No puedes iniciar un chat contigo mismo
            </Text>
          ) : null}

          {createPrivateChat.isError ? (
            <Text className="text-sm text-red-500">
              No se pudo crear la conversación. Intenta de nuevo
            </Text>
          ) : null}

          <View className="flex-row gap-2">
            <Button
              mode="text"
              onPress={() => {
                setIsPrivate(false);
                setSelected([]);
              }}
            >
              Volver
            </Button>
            <Button
              mode="contained"
              onPress={handlePrivateChat}
              disabled={!isValid || createPrivateChat.isPending}
              loading={createPrivateChat.isPending}
              accessibilityLabel="Iniciar chat"
            >
              {createPrivateChat.isPending
                ? 'Creando conversación...'
                : 'Iniciar chat'}
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}

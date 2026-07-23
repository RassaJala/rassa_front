import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useCreatePrivateConversation } from '@/features/chat/hooks/useCreatePrivateConversation';
import { useAuth } from '@/store/AuthContext';
import type { ChatStackParamList } from '@/types/chat';

type NavigationProp = NativeStackNavigationProp<ChatStackParamList>;

export default function StartChatScreen(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const createPrivateChat = useCreatePrivateConversation();

  const [isPrivate, setIsPrivate] = useState(false);
  const [userId, setUserId] = useState('');

  const isNumeric = /^\d+$/.test(userId);
  const isNotEmpty = userId.trim().length > 0;
  const isNotSelf = userId !== String(user?.id ?? '');
  const isValid = isNumeric && isNotEmpty && isNotSelf;

  const handlePrivateChat = () => {
    if (!isValid || createPrivateChat.isPending) return;

    createPrivateChat.mutate({ fk_usuario: Number(userId) });
  };

  const isSelfChat = isNotEmpty && isNumeric && !isNotSelf;

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

          <TextInput
            label="ID de usuario"
            value={userId}
            onChangeText={setUserId}
            mode="outlined"
            keyboardType="numeric"
            accessibilityLabel="ID de usuario"
            accessibilityHint="Ingresa el ID numérico del usuario"
          />

          {isSelfChat ? (
            <Text className="text-sm text-red-500">
              No puedes iniciar un chat contigo mismo
            </Text>
          ) : null}

          {createPrivateChat.isError ? (
            <Text className="text-sm text-red-500">
              No se pudo crear la conversación. Verifica el ID e intenta de
              nuevo
            </Text>
          ) : null}

          <View className="flex-row gap-2">
            <Button mode="text" onPress={() => setIsPrivate(false)}>
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

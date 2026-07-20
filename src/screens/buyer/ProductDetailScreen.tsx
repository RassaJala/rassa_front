import React from 'react';
import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import { useCreatePrivateConversation } from '@/features/chat/hooks/useCreatePrivateConversation';
import type { BuyerStackParamList } from '@/types';

export default function ProductDetailScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<BuyerStackParamList, 'ProductDetail'>>();
  const { farmerId } = route.params;

  const createConversation = useCreatePrivateConversation();

  const handleContact = () => {
    createConversation.mutate({ fk_usuario: farmerId });
  };

  return (
    <View className="flex-1 items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <Text
        variant="titleMedium"
        className="text-center text-gray-900 dark:text-gray-100"
      >
        Detalle del producto
      </Text>
      <Text
        variant="bodyMedium"
        className="mt-2 text-center text-gray-500 dark:text-gray-400"
      >
        Próximamente podrás ver aquí toda la información del producto.
      </Text>
      <Button
        mode="contained"
        buttonColor="#DE393A"
        className="mt-6 rounded-lg"
        loading={createConversation.isPending}
        disabled={createConversation.isPending}
        onPress={handleContact}
      >
        Contactar agricultor
      </Button>
    </View>
  );
}

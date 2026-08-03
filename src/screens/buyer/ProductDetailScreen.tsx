import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import { colors } from '@/constants/colors';
import { useCreatePrivateConversation } from '@/features/chat/hooks/useCreatePrivateConversation';
import { useTheme } from '@/store/ThemeContext';
import type { BuyerStackParamList } from '@/types';

export default function ProductDetailScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<BuyerStackParamList, 'ProductDetail'>>();
  const { farmerId } = route.params;
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;

  const createConversation = useCreatePrivateConversation();

  const handleContact = () => {
    createConversation.mutate({ fk_usuario: farmerId });
  };

  return (
    <View className="flex-1 p-4" style={{ backgroundColor: bg }}>
      <View className="flex-1 items-center justify-center">
        <MaterialCommunityIcons
          name="package-variant-closed"
          size={64}
          color={muted}
        />
        <Text
          className="mt-4 text-center text-xl font-bold"
          style={{ color: fg }}
        >
          Detalle del producto
        </Text>
        <Text
          className="mt-2 max-w-[260px] text-center text-sm"
          style={{ color: muted }}
        >
          Próximamente podrás ver aquí toda la información del producto.
        </Text>
        <Pressable
          onPress={handleContact}
          disabled={createConversation.isPending}
          className="mt-6 flex-row items-center gap-2 rounded-[10px] px-5 py-3"
          style={{
            backgroundColor: brand,
            opacity: createConversation.isPending ? 0.6 : 1,
          }}
        >
          <MaterialCommunityIcons
            name="chat-outline"
            size={20}
            color={colors.iconWhite}
          />
          <Text className="font-semibold" style={{ color: colors.iconWhite }}>
            {createConversation.isPending
              ? 'Iniciando chat...'
              : 'Contactar agricultor'}
          </Text>
        </Pressable>
        {createConversation.isError ? (
          <Text
            className="mt-3 text-center text-sm"
            style={{ color: colors.error }}
          >
            {createConversation.error?.message ??
              'No se pudo iniciar el chat. Intentá de nuevo.'}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

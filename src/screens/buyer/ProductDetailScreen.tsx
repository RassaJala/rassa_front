import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '@/constants/colors';
import { useCreatePrivateConversation } from '@/features/chat/hooks/useCreatePrivateConversation';
import { useTheme } from '@/store/ThemeContext';
import type { BuyerStackParamList } from '@/types';

type ChatNav = NativeStackNavigationProp<BuyerStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<BuyerStackParamList, 'ProductDetail'>>();
  const navigation = useNavigation<ChatNav>();
  const { farmerId } = route.params;
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;

  const createConversation = useCreatePrivateConversation();

  const handleContact = () => {
    createConversation.mutate(
      { fk_usuario: farmerId },
      {
        onSuccess: (conversation) => {
          navigation.navigate('Chat', {
            conversationId: conversation.id,
            title: conversation.nombre || 'Chat',
            tipo: conversation.tipo,
          });
        },
      },
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg, padding: 16 }}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialCommunityIcons
          name="package-variant-closed"
          size={64}
          color={muted}
        />
        <Text
          style={{
            marginTop: 16,
            fontSize: 20,
            fontWeight: '700',
            color: fg,
            textAlign: 'center',
          }}
        >
          Detalle del producto
        </Text>
        <Text
          style={{
            marginTop: 8,
            fontSize: 14,
            color: muted,
            textAlign: 'center',
            maxWidth: 260,
          }}
        >
          Próximamente podrás ver aquí toda la información del producto.
        </Text>
        <Pressable
          onPress={handleContact}
          disabled={createConversation.isPending}
          style={{
            marginTop: 24,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: brand,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 10,
            opacity: createConversation.isPending ? 0.6 : 1,
          }}
        >
          <MaterialCommunityIcons
            name="chat-outline"
            size={20}
            color={colors.iconWhite}
          />
          <Text style={{ color: colors.iconWhite, fontWeight: '600' }}>
            {createConversation.isPending
              ? 'Iniciando chat...'
              : 'Contactar agricultor'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

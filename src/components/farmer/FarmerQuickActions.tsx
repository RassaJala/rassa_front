import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { FarmerTheme } from '@/constants/theme';
import type { FarmerStackParamList } from '@/types';

type Nav = NativeStackNavigationProp<FarmerStackParamList, 'FarmerHome'>;

interface FarmerQuickActionsProps {
  navigation: Nav;
  theme: FarmerTheme;
}

export default function FarmerQuickActions({
  navigation,
  theme,
}: FarmerQuickActionsProps): React.JSX.Element {
  return (
    <>
      <Pressable
        onPress={() => navigation.navigate('FarmerDashboard')}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 10,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.coralBg,
            }}
          >
            <MaterialCommunityIcons
              name="bullhorn-outline"
              size={22}
              color={theme.coral}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.fg,
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              Publicaciones
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: theme.muted,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Creá y gestioná publicaciones semanales
            </Text>
          </View>
        </View>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('ProductList')}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.accentBg,
            }}
          >
            <MaterialCommunityIcons
              name="format-list-bulleted"
              size={22}
              color={theme.brand}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.fg,
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              Mis Productos
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: theme.muted,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Ver y gestionar tu catálogo
            </Text>
          </View>
        </View>
      </Pressable>
    </>
  );
}

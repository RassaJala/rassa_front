import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import LogoutButton from '@/components/LogoutButton';
import type { AdminStackParamList } from '@/types';

type NavigationProp = NativeStackNavigationProp<
  AdminStackParamList,
  'AdminPanel'
>;

interface Props {
  navigation: NavigationProp;
}

const menuItems = [
  {
    key: 'UserManagement',
    label: 'Usuarios',
    icon: '👥',
    description: 'Gestionar usuarios, roles y estados de cuenta',
  },
  {
    key: 'CategoryList',
    label: 'Categorías',
    icon: '📂',
    description: 'Administrar categorías de productos',
  },
  {
    key: 'UnitList',
    label: 'Unidades de Medida',
    icon: '📏',
    description: 'Administrar unidades (kg, pz, lt...)',
  },
];

export default function AdminPanelScreen({
  navigation,
}: Props): React.JSX.Element {
  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <View className="bg-brand-green-forest px-4 pb-6 pt-12">
        <Text className="text-2xl font-bold text-white">Panel Admin</Text>
        <Text className="mt-1 text-sm text-white/80">
          Administración del sistema
        </Text>
      </View>

      {/* Menu */}
      <View className="flex-1 gap-3 p-4">
        {menuItems.map((item) => (
          <Pressable
            key={item.key}
            onPress={() =>
              navigation.navigate(
                item.key as 'UserManagement' | 'CategoryList' | 'UnitList',
              )
            }
            className="flex-row items-center rounded-xl bg-white p-4 shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none"
          >
            <Text className="mr-4 text-3xl">{item.icon}</Text>
            <View className="flex-1">
              <Text className="text-base font-semibold text-brand-ink dark:text-gray-100">
                {item.label}
              </Text>
              <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {item.description}
              </Text>
            </View>
            <Text className="text-xl text-gray-300">→</Text>
          </Pressable>
        ))}
      </View>

      {/* Logout */}
      <View className="border-t border-gray-200 p-4 dark:border-gray-800">
        <LogoutButton mode="contained" />
      </View>
    </View>
  );
}

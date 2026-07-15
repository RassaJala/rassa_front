import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  readonly navigation: NavigationProp;
}

const menuItems = [
  {
    key: 'CategoryList' as const,
    label: 'Categorías',
    icon: 'folder-outline' as const,
    description: 'Administrar categorías de productos',
    iconBg: 'bg-amber-50 dark:bg-amber-900/20',
    iconColor: '#D97706',
  },
  {
    key: 'UnitList' as const,
    label: 'Unidades de Medida',
    icon: 'ruler' as const,
    description: 'Administrar unidades (kg, pz, lt...)',
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
    iconColor: '#2563EB',
  },
];

export default function AdminPanelScreen({
  navigation,
}: Props): React.JSX.Element {
  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <View className="bg-brand-green-forest px-4 pb-7 pt-14">
        <Text className="text-2xl font-bold tracking-tight text-white">
          Panel de Administración
        </Text>
        <Text className="mt-1.5 text-sm text-white/75">
          Gestiona los recursos del sistema
        </Text>
      </View>

      {/* Menu */}
      <View className="flex-1 gap-3 p-4">
        {menuItems.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => navigation.navigate(item.key)}
            className="flex-row items-center rounded-xl bg-white p-4 shadow-sm active:opacity-80 dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none"
          >
            <View
              className={`mr-4 h-12 w-12 items-center justify-center rounded-xl ${item.iconBg}`}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={24}
                color={item.iconColor}
              />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-brand-ink dark:text-gray-100">
                {item.label}
              </Text>
              <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {item.description}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color="#9CA3AF"
            />
          </Pressable>
        ))}
      </View>

      {/* Logout */}
      <View className="border-t border-gray-200 px-4 py-4 dark:border-gray-800">
        <LogoutButton mode="contained" />
      </View>
    </View>
  );
}

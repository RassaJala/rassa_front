import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { colors } from '@/constants/colors';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  screen: string;
  icon: string;
}

const NAV_CONFIG: Record<UserRole, NavItem[]> = {
  admin: [
    { label: 'Home', screen: 'AdminDashboard', icon: 'view-dashboard' },
    { label: 'Usuarios', screen: 'AdminUsers', icon: 'account-group' },
    { label: 'Productos', screen: 'AdminProducts', icon: 'package-variant' },
    { label: 'Notificaciones', screen: 'Notificaciones', icon: 'bell' },
  ],
  buyer: [
    { label: 'Home', screen: 'Home', icon: 'home' },
    { label: 'Carrito', screen: 'Carrito', icon: 'cart' },
    { label: 'Notificaciones', screen: 'Notificaciones', icon: 'bell' },
  ],
  farmer: [
    { label: 'Home', screen: 'MyProducts', icon: 'leaf' },
    { label: 'Productos', screen: 'AddProduct', icon: 'plus-circle' },
    { label: 'Notificaciones', screen: 'Notificaciones', icon: 'bell' },
  ],
  seller: [
    { label: 'Home', screen: 'SellerHome', icon: 'storefront' },
    { label: 'Perfil', screen: 'Perfil', icon: 'account' },
    { label: 'Ventas', screen: 'Sales', icon: 'cash' },
    { label: 'Notificaciones', screen: 'Notificaciones', icon: 'bell' },
  ],
};

export default function Navbar(): React.JSX.Element {
  const { user, logout } = useAuth();
  const { colorScheme, toggleColorScheme } = useTheme();
  const navigation = useNavigation();

  const state = navigation.getState();
  const currentRoute = state?.routes[state.index]?.name;

  const items = NAV_CONFIG[user?.role ?? 'buyer'];
  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-row items-center border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <Text className="mr-6 text-lg font-bold text-brand-ink dark:text-white">
        RASSA
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-1"
      >
        {items.map((item) => {
          const isActive = currentRoute === item.screen;

          return (
            <Pressable
              key={item.screen}
              className="mr-1 flex-row items-center rounded-lg px-3 py-2"
              onPress={() => {
                navigation.navigate(item.screen as never);
              }}
              accessibilityLabel={`Ir a ${item.label}`}
              accessibilityRole="button"
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name={item.icon as never}
                size={18}
                color={
                  isActive
                    ? colors.brandGreenForest
                    : isDark
                      ? colors.textTertiary
                      : colors.textSecondary
                }
              />

              <Text
                className={`ml-1.5 text-sm font-medium ${
                  isActive
                    ? 'text-brand-green-forest'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        className="ml-2 rounded-lg px-3 py-2"
        onPress={() => {
          toggleColorScheme();
        }}
        accessibilityLabel="Alternar tema claro y oscuro"
        accessibilityRole="button"
        hitSlop={8}
      >
        <MaterialCommunityIcons
          name={isDark ? 'weather-sunny' : 'weather-night'}
          size={20}
          color={isDark ? colors.surface : colors.iconDark}
        />
      </Pressable>

      <Pressable
        className="ml-2 flex-row items-center rounded-lg px-3 py-2"
        onPress={() => void logout()}
        accessibilityLabel="Cerrar sesión"
        accessibilityRole="button"
        hitSlop={8}
      >
        <MaterialCommunityIcons
          name="logout"
          size={18}
          color={colors.brandRedCoral}
        />

        <Text className="ml-1.5 text-sm font-medium text-brand-red-coral">
          Salir
        </Text>
      </Pressable>
    </View>
  );
}

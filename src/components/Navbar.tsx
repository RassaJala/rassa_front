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
    { label: 'Panel', screen: 'AdminPanel', icon: 'view-dashboard' },
    { label: 'Familias', screen: 'FamilyList', icon: 'account-group' },
    { label: 'Categorías', screen: 'CategoryList', icon: 'folder' },
    { label: 'Unidades', screen: 'UnitList', icon: 'ruler' },
  ],
  buyer: [
    { label: 'Home', screen: 'Home', icon: 'home' },
    { label: 'Carrito', screen: 'Carrito', icon: 'cart' },
  ],
  farmer: [
    { label: 'Home', screen: 'MyProducts', icon: 'leaf' },
    { label: 'Productos', screen: 'AddProduct', icon: 'plus-circle' },
  ],
  seller: [
    { label: 'Home', screen: 'SellerHome', icon: 'storefront' },
    { label: 'Ventas', screen: 'Sales', icon: 'cash' },
  ],
};

export default function Navbar(): React.JSX.Element {
  const { user, logout } = useAuth();
  const { colorScheme, toggleColorScheme, isLoaded } = useTheme();
  const navigation = useNavigation();

  const state = navigation.getState();
  const currentRoute = state?.routes[state.index]?.name;

  const items = NAV_CONFIG[user?.role ?? 'buyer'];
  const isDark = colorScheme === 'dark';

  const bg = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: border,
        backgroundColor: bg,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <Text
        style={{
          marginRight: 24,
          fontSize: 18,
          fontWeight: '700',
          color: brand,
          letterSpacing: -0.3,
        }}
      >
        RASSA
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {items.map((item) => {
          const isActive =
            currentRoute === item.screen ||
            (currentRoute === 'AdminPanel' && item.screen === 'AdminDashboard');

          return (
            <Pressable
              key={item.screen}
              style={{
                marginRight: 4,
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
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
                color={isActive ? brand : muted}
              />

              <Text
                style={{
                  marginLeft: 6,
                  fontSize: 14,
                  fontWeight: '500',
                  color: isActive ? brand : muted,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoaded ? (
        <Pressable
          style={{
            marginLeft: 8,
            borderRadius: 999,
            backgroundColor: isDark ? colors.admSegBgD : colors.admSegBgL,
            padding: 10,
          }}
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
            color={isDark ? colors.iconWhite : colors.iconDark}
          />
        </Pressable>
      ) : null}

      <Pressable
        style={{
          marginLeft: 8,
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
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

        <Text
          style={{
            marginLeft: 6,
            fontSize: 14,
            fontWeight: '500',
            color: colors.brandRedCoral,
          }}
        >
          Salir
        </Text>
      </Pressable>
    </View>
  );
}

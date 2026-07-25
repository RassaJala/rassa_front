import React, { useCallback, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import FarmerDrawer from '@/components/farmer/FarmerDrawer';
import FarmerQuickActions from '@/components/farmer/FarmerQuickActions';
import FarmerStats from '@/components/farmer/FarmerStats';
import { farmerTheme } from '@/constants/theme';
import { useFarmerHomeStats } from '@/hooks/useFarmerHomeStats';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { useScreenWidth } from '@/hooks/useScreenWidth';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { FarmerStackParamList } from '@/types';

type Nav = NativeStackNavigationProp<FarmerStackParamList, 'FarmerHome'>;

interface Props {
  readonly navigation: Nav;
}

const DRAWER_WIDTH_RATIO = 0.55;
const COMPACT_BREAKPOINT = 400;

export default function FarmerHomeScreen({
  navigation,
}: Props): React.JSX.Element {
  const { colorScheme, toggleColorScheme } = useTheme();
  const { user, logout } = useAuth();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const screenWidth = useScreenWidth();
  const isCompact = screenWidth < COMPACT_BREAKPOINT;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const theme = farmerTheme(isDark);
  const { totalProducts, totalPublications, activePublications } =
    useFarmerHomeStats();

  const { today } = useFormattedDate();

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const closeDrawer = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setDrawerOpen(false);
    });
  }, [slideAnim]);

  interface MenuItem {
    icon: string;
    label: string;
    desc: string;
    color: string;
    action: () => void;
  }

  const menuItems: MenuItem[] = [
    {
      icon: 'account-circle-outline',
      label: 'Perfil',
      desc: 'Tu información personal',
      color: theme.fg,
      action: closeDrawer,
    },
    {
      icon: isDark ? 'weather-sunny' : 'weather-night',
      label: `Tema ${isDark ? 'claro' : 'oscuro'}`,
      desc: 'Alternar apariencia',
      color: theme.fg,
      action: toggleColorScheme,
    },
    {
      icon: 'cog-outline',
      label: 'Configuración',
      desc: 'Preferencias del sistema',
      color: theme.fg,
      action: closeDrawer,
    },
    {
      icon: 'logout',
      label: 'Cerrar sesión',
      desc: '',
      color: theme.coral,
      action: () => {
        closeDrawer();
        void logout();
      },
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 24),
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              paddingTop: insets.top + 16,
              paddingHorizontal: 20,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <View
                style={{ flex: 1, flexShrink: 1, minWidth: 0, paddingRight: 8 }}
              >
                <Text
                  style={{
                    fontSize: isCompact ? 12 : 14,
                    fontWeight: '600',
                    letterSpacing: 0.06,
                    textTransform: 'uppercase',
                    color: theme.muted,
                  }}
                  numberOfLines={2}
                >
                  {today}
                </Text>
                <Text
                  style={{
                    fontSize: isCompact ? 28 : 32,
                    fontWeight: '700',
                    letterSpacing: -0.3,
                    color: theme.fg,
                  }}
                >
                  Inicio
                </Text>
                <Text
                  style={{
                    fontSize: isCompact ? 17 : 20,
                    fontWeight: '700',
                    color: theme.muted,
                    marginTop: 4,
                  }}
                  numberOfLines={2}
                >
                  Bienvenido, {user?.nombre ?? 'Agricultor'}
                </Text>
              </View>
              <View
                style={{ flexDirection: 'row', flexShrink: 0, marginLeft: 8 }}
              >
                <Pressable
                  onPress={openDrawer}
                  style={({ pressed }) => ({
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: theme.surface,
                    borderWidth: 1,
                    borderColor: theme.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <MaterialCommunityIcons
                    name="account-circle"
                    size={28}
                    color={theme.fg}
                  />
                </Pressable>
              </View>
            </View>

            <FarmerStats
              isCompact={isCompact}
              theme={theme}
              totalProducts={totalProducts}
              activePublications={activePublications}
              totalPublications={totalPublications}
            />

            <FarmerQuickActions navigation={navigation} theme={theme} />
          </View>
        </ScrollView>
      </View>

      <FarmerDrawer
        isOpen={drawerOpen}
        isDark={isDark}
        user={user}
        slideAnim={slideAnim}
        screenWidth={screenWidth}
        drawerWidthRatio={DRAWER_WIDTH_RATIO}
        theme={theme}
        menuItems={menuItems}
        onClose={closeDrawer}
      />
    </View>
  );
}

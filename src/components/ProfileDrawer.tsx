import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';

const DRAWER_WIDTH = 0.55;
const SCREEN_WIDTH = Dimensions.get('window').width;

interface DrawerContextValue {
  openDrawer: () => void;
  closeDrawer: () => void;
  drawerOpen: boolean;
  slideAnim: Animated.Value;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

function useDrawer(): DrawerContextValue {
  const ctx = useContext(DrawerContext);
  if (!ctx)
    throw new Error('useDrawer must be used inside ProfileDrawerProvider');
  return ctx;
}

interface ProfileDrawerProviderProps {
  readonly children: React.ReactNode;
  readonly defaultName?: string;
  readonly defaultEmail?: string;
  readonly onProfilePress?: () => void;
}

export function ProfileDrawerProvider({
  children,
  defaultName = 'Usuario',
  defaultEmail = 'usuario@rassa.com',
  onProfilePress,
}: ProfileDrawerProviderProps): React.JSX.Element {
  const { colorScheme, toggleColorScheme } = useTheme();
  const { user, logout } = useAuth();

  const isDark = colorScheme === 'dark';
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admSegBgL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const accentBg = isDark ? colors.admActiveBgD : colors.admActiveBgL;
  const coral = colors.brandRedCoral;
  const drawerBg = isDark ? colors.admBgD : colors.surface;
  const overlayBg = '#000';

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

  const drawerTranslate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_WIDTH * DRAWER_WIDTH, 0],
  });

  const overlayOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

  interface MenuItem {
    icon: string;
    label: string;
    color: string;
    action: () => void;
  }

  const menuItems: MenuItem[] = [
    {
      icon: 'account-circle-outline',
      label: 'Perfil',
      color: fg,
      action: () => {
        closeDrawer();
        onProfilePress?.();
      },
    },

    {
      icon: isDark ? 'weather-sunny' : 'weather-night',
      label: `Tema ${isDark ? 'claro' : 'oscuro'}`,
      color: fg,
      action: toggleColorScheme,
    },
    {
      icon: 'cog-outline',
      label: 'Configuración',
      color: fg,
      action: closeDrawer,
    },
    {
      icon: 'logout',
      label: 'Cerrar sesión',
      color: coral,
      action: () => {
        closeDrawer();
        void logout();
      },
    },
  ];

  const ctx = useMemo<DrawerContextValue>(
    () => ({ openDrawer, closeDrawer, drawerOpen, slideAnim }),
    [openDrawer, closeDrawer, drawerOpen, slideAnim],
  );

  return (
    <DrawerContext.Provider value={ctx}>
      <View style={{ flex: 1 }}>
        {children}

        {drawerOpen ? (
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              right: 0,
              opacity: overlayOpacity,
              backgroundColor: overlayBg,
              zIndex: 100,
            }}
          >
            <Pressable onPress={closeDrawer} style={{ flex: 1 }} />
          </Animated.View>
        ) : null}

        <Animated.View
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: `${DRAWER_WIDTH * 100}%`,
            backgroundColor: drawerBg,
            transform: [{ translateX: drawerTranslate }],
            borderLeftWidth: 1,
            borderLeftColor: border,
            zIndex: 101,
          }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View
              style={{
                alignItems: 'center',
                paddingTop: 60,
                paddingHorizontal: 20,
                paddingBottom: 24,
                marginBottom: 20,
                borderBottomWidth: 1,
                borderBottomColor: border,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: accentBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <MaterialCommunityIcons
                  name="account-circle"
                  size={40}
                  color={brand}
                />
              </View>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '700',
                  color: fg,
                  letterSpacing: -0.2,
                }}
              >
                {user?.nombre ?? defaultName}
              </Text>
              <Text style={{ fontSize: 15, color: muted, marginTop: 4 }}>
                {user?.email ?? defaultEmail}
              </Text>
            </View>

            <View style={{ paddingHorizontal: 16, gap: 6 }}>
              {menuItems.map((item, i) => {
                const isLast = i === menuItems.length - 1;
                return (
                  <Pressable
                    key={i}
                    onPress={item.action}
                    style={({ pressed }) => ({
                      backgroundColor: isLast
                        ? (isDark
                          ? colors.admCoralBgD
                          : colors.admCoralBgL)
                        : (isDark
                          ? colors.admInactiveBgD
                          : colors.admInactiveBgL),
                      borderRadius: 16,
                      borderWidth: isLast ? 1 : 0,
                      borderColor: isLast
                        ? (isDark
                          ? 'rgba(222,57,58,0.25)'
                          : 'rgba(222,57,58,0.15)')
                        : colors.transparent,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        minHeight: 56,
                      }}
                    >
                      <MaterialCommunityIcons
                        name={
                          item.icon as keyof typeof MaterialCommunityIcons.glyphMap
                        }
                        size={28}
                        color={item.color}
                      />
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: '600',
                          color: item.color,
                          letterSpacing: -0.15,
                          flexShrink: 1,
                        }}
                      >
                        {item.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </DrawerContext.Provider>
  );
}

export function ProfileDrawerTrigger(): React.JSX.Element {
  const { openDrawer } = useDrawer();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const fg = isDark ? colors.admFgD : colors.admFgL;

  return (
    <Pressable
      onPress={openDrawer}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: isDark ? colors.admSurfaceD : colors.surface,
        borderWidth: 1,
        borderColor: isDark ? colors.admBorderD : colors.admBorderL,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <MaterialCommunityIcons name="account-circle" size={24} color={fg} />
    </Pressable>
  );
}

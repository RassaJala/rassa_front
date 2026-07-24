import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import api from '@/services/api';
import type { PublicacionList } from '@/services/publications';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { ApiResponse, FarmerStackParamList, Producto } from '@/types';

type Nav = NativeStackNavigationProp<FarmerStackParamList, 'FarmerHome'>;

interface Props {
  readonly navigation: Nav;
}

const DRAWER_WIDTH = 0.55;

function useScreenWidth(): number {
  const [width, setWidth] = useState(() => Dimensions.get('window').width);

  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWidth(window.width);
    });
    return () => subscription.remove();
  }, []);

  return width;
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- farmer home with stats/grid/drawer logic
export default function FarmerHomeScreen({
  navigation,
}: Props): React.JSX.Element {
  const { colorScheme, toggleColorScheme } = useTheme();
  const { user, logout } = useAuth();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const screenWidth = useScreenWidth();
  const isCompact = screenWidth < 400;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const { data: productsData } = useQuery({
    queryKey: ['productos-count'],
    queryFn: async () => {
      const { data } =
        await api.get<ApiResponse<{ results: Producto[]; count?: number }>>(
          '/productos/',
        );
      return data.data;
    },
    staleTime: 30_000,
  });

  const { data: pubsData } = useQuery({
    queryKey: ['publicaciones-count'],
    queryFn: async () => {
      const { data } =
        await api.get<ApiResponse<PublicacionList>>('/publicaciones/');
      return data.data;
    },
    staleTime: 30_000,
  });

  const totalProducts =
    productsData?.count ?? productsData?.results?.length ?? 0;
  const totalPublications = pubsData?.count ?? 0;
  const activePublications =
    pubsData?.results?.filter((p) => p.estado === 'publicado').length ?? 0;

  const bg = isDark ? '#1A211B' : '#F5F7F0';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#353D35' : '#E2E6DF';
  const sidebarBorder = isDark ? '#353D35' : '#E8ECE4';
  const brand = isDark ? '#4A8A63' : '#24563C';
  const accentBg = isDark ? 'rgba(74,138,99,0.12)' : 'rgba(36,86,60,0.07)';
  const coralBg = isDark ? 'rgba(232,74,74,0.12)' : 'rgba(222,57,58,0.07)';
  const pumpkinBg = isDark ? 'rgba(212,160,32,0.12)' : 'rgba(242,169,0,0.07)';
  const coral = '#DE393A';
  const pumpkin = '#F2A900';
  const drawerBg = isDark ? '#1A211B' : '#FFFFFF';
  const overlayBg = '#000';

  const days = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
  ];
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];
  const d = new Date();
  const today = `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}`;

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
    outputRange: [screenWidth * DRAWER_WIDTH, 0],
  });

  const overlayOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

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
      color: fg,
      action: closeDrawer,
    },
    {
      icon: isDark ? 'weather-sunny' : 'weather-night',
      label: `Tema ${isDark ? 'claro' : 'oscuro'}`,
      desc: 'Alternar apariencia',
      color: fg,
      action: toggleColorScheme,
    },
    {
      icon: 'cog-outline',
      label: 'Configuración',
      desc: 'Preferencias del sistema',
      color: fg,
      action: closeDrawer,
    },
    {
      icon: 'logout',
      label: 'Cerrar sesión',
      desc: '',
      color: coral,
      action: () => {
        closeDrawer();
        void logout();
      },
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
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
            {/* HEADER */}
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
                    color: muted,
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
                    color: fg,
                  }}
                >
                  Inicio
                </Text>
                <Text
                  style={{
                    fontSize: isCompact ? 17 : 20,
                    fontWeight: '700',
                    color: muted,
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
                    backgroundColor: surface,
                    borderWidth: 1,
                    borderColor: border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <MaterialCommunityIcons
                    name="account-circle"
                    size={28}
                    color={fg}
                  />
                </Pressable>
              </View>
            </View>

            {/* STATS */}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                paddingVertical: 24,
                gap: isCompact ? 8 : 10,
              }}
            >
              <View
                style={{
                  flex: 1,
                  minWidth: isCompact ? '45%' : 0,
                  alignItems: 'center',
                  backgroundColor: surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: border,
                  paddingVertical: isCompact ? 14 : 18,
                  paddingHorizontal: isCompact ? 6 : 10,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: accentBg,
                    marginBottom: 10,
                  }}
                >
                  <MaterialCommunityIcons
                    name="package-variant"
                    size={24}
                    color={brand}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '700',
                    letterSpacing: -0.2,
                    color: brand,
                  }}
                >
                  {totalProducts}
                </Text>
                <Text
                  style={{
                    fontSize: isCompact ? 11 : 13,
                    fontWeight: '600',
                    letterSpacing: 0.06,
                    textTransform: 'uppercase',
                    color: muted,
                    marginTop: 4,
                    textAlign: 'center',
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  Productos
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  minWidth: isCompact ? '45%' : 0,
                  alignItems: 'center',
                  backgroundColor: surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: border,
                  paddingVertical: isCompact ? 14 : 18,
                  paddingHorizontal: isCompact ? 6 : 10,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: coralBg,
                    marginBottom: 10,
                  }}
                >
                  <MaterialCommunityIcons
                    name="check-circle-outline"
                    size={24}
                    color={coral}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '700',
                    letterSpacing: -0.2,
                    color: coral,
                  }}
                >
                  {activePublications}
                </Text>
                <Text
                  style={{
                    fontSize: isCompact ? 11 : 13,
                    fontWeight: '600',
                    letterSpacing: 0.06,
                    textTransform: 'uppercase',
                    color: muted,
                    marginTop: 4,
                    textAlign: 'center',
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  Publicadas
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  minWidth: isCompact ? '45%' : 0,
                  alignItems: 'center',
                  backgroundColor: surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: border,
                  paddingVertical: isCompact ? 14 : 18,
                  paddingHorizontal: isCompact ? 6 : 10,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: pumpkinBg,
                    marginBottom: 10,
                  }}
                >
                  <MaterialCommunityIcons
                    name="clipboard-list"
                    size={24}
                    color={pumpkin}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '700',
                    letterSpacing: -0.2,
                    color: pumpkin,
                  }}
                >
                  {totalPublications}
                </Text>
                <Text
                  style={{
                    fontSize: isCompact ? 11 : 13,
                    fontWeight: '600',
                    letterSpacing: 0.06,
                    textTransform: 'uppercase',
                    color: muted,
                    marginTop: 4,
                    textAlign: 'center',
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  Total pubs
                </Text>
              </View>
            </View>

            {/* QUICK ACTIONS */}
            <Pressable
              onPress={() => navigation.navigate('FarmerDashboard')}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: surface,
                  borderWidth: 1,
                  borderColor: border,
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
                    backgroundColor: coralBg,
                  }}
                >
                  <MaterialCommunityIcons
                    name="bullhorn-outline"
                    size={22}
                    color={coral}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: fg,
                      marginBottom: 2,
                    }}
                    numberOfLines={1}
                  >
                    Publicaciones
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: muted,
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
                  backgroundColor: surface,
                  borderWidth: 1,
                  borderColor: border,
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
                    backgroundColor: accentBg,
                  }}
                >
                  <MaterialCommunityIcons
                    name="format-list-bulleted"
                    size={22}
                    color={brand}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: fg,
                      marginBottom: 2,
                    }}
                    numberOfLines={1}
                  >
                    Mis Productos
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: muted,
                    }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Ver y gestionar tu catálogo
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      {/* OVERLAY */}
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
            zIndex: 10,
          }}
        >
          <Pressable onPress={closeDrawer} style={{ flex: 1 }} />
        </Animated.View>
      ) : null}

      {/* DRAWER */}
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
          borderLeftColor: sidebarBorder,
          zIndex: 11,
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
              borderBottomColor: sidebarBorder,
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
              {user?.nombre ?? 'Agricultor'}
            </Text>
            <Text style={{ fontSize: 15, color: muted, marginTop: 4 }}>
              {user?.email ?? ''}
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
                      ? isDark
                        ? 'rgba(222,57,58,0.1)'
                        : 'rgba(222,57,58,0.07)'
                      : isDark
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.03)',
                    borderRadius: 16,
                    borderWidth: isLast ? 1 : 0,
                    borderColor: isLast
                      ? isDark
                        ? 'rgba(222,57,58,0.25)'
                        : 'rgba(222,57,58,0.15)'
                      : 'transparent',
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
  );
}

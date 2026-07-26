import React, { useState } from 'react';
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import {
  ProfileDrawerProvider,
  ProfileDrawerTrigger,
} from '@/components/ProfileDrawer';
import api from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { ApiResponse, FarmerStackParamList, Producto } from '@/types';

type Nav = NativeStackNavigationProp<FarmerStackParamList, 'FarmerHome'>;

interface Props {
  readonly navigation: Nav;
}

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

// eslint-disable-next-line sonarjs/cognitive-complexity -- farmer home with stats/grid layout
export default function FarmerHomeScreen({
  navigation,
}: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const { user } = useAuth();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const screenWidth = useScreenWidth();
  const isCompact = screenWidth < 400;

  const { data: productsData, isError: isProductsError } = useQuery({
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

  const totalProducts =
    productsData?.count ?? productsData?.results?.length ?? 0;

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const bg = isDark ? '#1A211B' : '#F5F7F0';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#353D35' : '#E2E6DF';
  const brand = isDark ? '#4A8A63' : '#24563C';
  const accentBg = isDark ? 'rgba(74,138,99,0.12)' : 'rgba(36,86,60,0.07)';
  const coralBg = isDark ? 'rgba(232,74,74,0.12)' : 'rgba(222,57,58,0.07)';
  const pumpkinBg = isDark ? 'rgba(212,160,32,0.12)' : 'rgba(242,169,0,0.07)';
  const coral = '#DE393A';
  const pumpkin = '#F2A900';

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

  return (
    <ProfileDrawerProvider
      defaultName="Agricultor"
      defaultEmail="agricultor@rassa.com"
      onProfilePress={handleProfilePress}
    >
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
                  style={{
                    flex: 1,
                    flexShrink: 1,
                    minWidth: 0,
                    paddingRight: 8,
                  }}
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
                  <ProfileDrawerTrigger />
                </View>
              </View>

              {/* Error feedback for stats */}
              {isProductsError ? (
                <View
                  style={{
                    backgroundColor: coralBg,
                    borderRadius: 12,
                    padding: 12,
                    marginTop: 16,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: coral,
                      textAlign: 'center',
                    }}
                  >
                    No se pudieron cargar los datos. Los valores pueden no estar
                    actualizados.
                  </Text>
                </View>
              ) : null}

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
                    {0}
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
                    Activos
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
                    {0}
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
                    Pedidos
                  </Text>
                </View>
              </View>

              {/* QUICK ACTIONS */}
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
      </View>
    </ProfileDrawerProvider>
  );
}

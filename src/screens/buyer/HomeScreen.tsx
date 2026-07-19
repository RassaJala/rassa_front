import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  ProfileDrawerProvider,
  ProfileDrawerTrigger,
} from '@/components/ProfileDrawer';
import { getAllProducts } from '@/services/mock/dashboard';
import { useTheme } from '@/store/ThemeContext';
import { colors } from '@/constants/colors';
import type { BuyerStackParamList } from '@/types';

type Nav = NativeStackNavigationProp<BuyerStackParamList, 'BuyerTabs'>;

interface Props {
  readonly navigation: Nav;
}

export default function HomeScreen({ navigation }: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const allProducts = getAllProducts();

  const handleProfilePress = () => {
    navigation.getParent()?.navigate('Profile');
  };

  const bg = isDark ? colors.admlBgD : colors.admlBgL;
  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const fg = isDark ? colors.admlFgD : colors.admlFgL;
  const muted = isDark ? colors.admlMutedD : colors.admlMutedL;
  const border = isDark ? colors.admlBorderD : colors.admlBorderL;
  const brand = isDark ? colors.admlBrandD : colors.admlBrandL;
  const accentBg = isDark ? colors.admActiveBgD : colors.admActiveBgL;
  const coralBg = isDark ? colors.admCoralBgD : colors.admCoralBgL;
  const pumpkinBg = isDark ? colors.admPumpkinBgD : colors.admPumpkinBgL;
  const coral = colors.brandRedCoral;
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
      defaultName="Cliente"
      defaultEmail="cliente@rassa.com"
      onProfilePress={handleProfilePress}
    >
      <View style={{ flex: 1, backgroundColor: bg }}>
        <View style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flex: 1, paddingTop: 48, paddingHorizontal: 20 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      letterSpacing: 0.06,
                      textTransform: 'uppercase',
                      color: muted,
                    }}
                  >
                    {today}
                  </Text>
                  <Text
                    style={{
                      fontSize: 32,
                      fontWeight: '700',
                      letterSpacing: -0.3,
                      color: fg,
                    }}
                  >
                    Inicio
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    style={({ pressed }) => ({
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: surface,
                      borderWidth: 1,
                      borderColor: border,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <MaterialCommunityIcons
                      name="bell-outline"
                      size={24}
                      color={fg}
                    />
                  </Pressable>
                  <ProfileDrawerTrigger />
                </View>
              </View>

              <View
                style={{ flexDirection: 'row', gap: 10, paddingVertical: 24 }}
              >
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    backgroundColor: surface,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: border,
                    paddingVertical: 18,
                    paddingHorizontal: 10,
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
                    {allProducts.length.toLocaleString()}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      letterSpacing: 0.06,
                      textTransform: 'uppercase',
                      color: muted,
                      marginTop: 4,
                    }}
                  >
                    Productos
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    backgroundColor: surface,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: border,
                    paddingVertical: 18,
                    paddingHorizontal: 10,
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
                      name="heart-outline"
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
                    8
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      letterSpacing: 0.06,
                      textTransform: 'uppercase',
                      color: muted,
                      marginTop: 4,
                    }}
                  >
                    Favoritos
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    backgroundColor: surface,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: border,
                    paddingVertical: 18,
                    paddingHorizontal: 10,
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
                      name="truck-outline"
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
                    0
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      letterSpacing: 0.06,
                      textTransform: 'uppercase',
                      color: muted,
                      marginTop: 4,
                    }}
                  >
                    Pedidos
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </ProfileDrawerProvider>
  );
}

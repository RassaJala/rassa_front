import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import {
  ProfileDrawerProvider,
  ProfileDrawerTrigger,
} from '@/components/ProfileDrawer';
import StatCard from '@/components/StatCard';
import { colors } from '@/constants/colors';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { getSellerStats } from '@/services/mock/dashboard';
import { useTheme } from '@/store/ThemeContext';
import type { SellerTabsParamList } from '@/types';

type Nav = BottomTabNavigationProp<SellerTabsParamList, 'HomeSeller'>;

interface Props {
  readonly navigation: Nav;
}

export default function HomeSellerScreen({
  navigation,
}: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const stats = getSellerStats();

  const handleProfilePress = () => {
    navigation.navigate('Perfil');
  };

  const handleWastePress = () => {
    navigation.getParent()?.navigate('WasteRegister');
  };

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const accentBg = isDark ? colors.admActiveBgD : colors.admActiveBgL;
  const coralBg = isDark ? colors.admCoralBgD : colors.admCoralBgL;
  const pumpkinBg = isDark ? colors.admPumpkinBgD : colors.admPumpkinBgL;
  const coral = colors.brandRedCoral;
  const pumpkin = colors.accent;

  const { today } = useFormattedDate();

  return (
    <ProfileDrawerProvider
      defaultName="Vendedor"
      defaultEmail="vendedor@rassa.com"
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
                <StatCard
                  icon="cash"
                  value={`$${stats.salesToday.toLocaleString()}`}
                  label="Ventas Hoy"
                  surface={surface}
                  border={border}
                  muted={muted}
                  iconBg={accentBg}
                  iconColor={brand}
                />
                <StatCard
                  icon="chart-line"
                  value={`$${stats.salesWeek.toLocaleString()}`}
                  label="Ventas Semana"
                  surface={surface}
                  border={border}
                  muted={muted}
                  iconBg={coralBg}
                  iconColor={coral}
                />
                <StatCard
                  icon="calendar-month"
                  value={`$${stats.salesMonth.toLocaleString()}`}
                  label="Ventas Mes"
                  surface={surface}
                  border={border}
                  muted={muted}
                  iconBg={pumpkinBg}
                  iconColor={pumpkin}
                />
              </View>

              {/* QUICK ACTIONS */}
              <Pressable
                onPress={handleWastePress}
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
                      backgroundColor: coralBg,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="package-variant-remove"
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
                      Registrar Merma
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: muted,
                      }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      Descuenta stock por pérdida o desperdicio
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

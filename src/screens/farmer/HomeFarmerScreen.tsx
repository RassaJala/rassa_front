import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  ProfileDrawerProvider,
  ProfileDrawerTrigger,
} from '@/components/ProfileDrawer';
import StatCard from '@/components/StatCard';
import { colors } from '@/constants/colors';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { getFarmerStats } from '@/services/mock/dashboard';
import { useTheme } from '@/store/ThemeContext';
import type { FarmerStackParamList } from '@/types';

type Nav = NativeStackNavigationProp<FarmerStackParamList, 'FarmerTabs'>;

interface Props {
  readonly navigation: Nav;
}

export default function HomeFarmerScreen({
  navigation,
}: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const stats = getFarmerStats();

  const handleProfilePress = () => {
    navigation.getParent()?.navigate('Profile');
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
      defaultName="Agricultor"
      defaultEmail="agricultor@rassa.com"
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
              {/* ═══ HEADER ═══ */}
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

              {/* ═══ STATS ═══ */}
              <View
                style={{ flexDirection: 'row', gap: 10, paddingVertical: 24 }}
              >
                <StatCard
                  icon="sprout"
                  value={stats.totalProducts.toLocaleString()}
                  label="Productos"
                  surface={surface}
                  border={border}
                  muted={muted}
                  iconBg={accentBg}
                  iconColor={brand}
                />
                <StatCard
                  icon="clipboard-check"
                  value={stats.ordersReceived.toLocaleString()}
                  label="Pedidos"
                  surface={surface}
                  border={border}
                  muted={muted}
                  iconBg={coralBg}
                  iconColor={coral}
                />
                <StatCard
                  icon="cash"
                  value={`$${stats.revenue.toLocaleString()}`}
                  label="Ingresos"
                  surface={surface}
                  border={border}
                  muted={muted}
                  iconBg={pumpkinBg}
                  iconColor={pumpkin}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </ProfileDrawerProvider>
  );
}

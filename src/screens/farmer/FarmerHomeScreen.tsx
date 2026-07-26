import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import FarmerQuickActions from '@/components/farmer/FarmerQuickActions';
import FarmerStats from '@/components/farmer/FarmerStats';
import {
  ProfileDrawerProvider,
  ProfileDrawerTrigger,
} from '@/components/ProfileDrawer';
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

const COMPACT_BREAKPOINT = 400;

// eslint-disable-next-line sonarjs/cognitive-complexity -- farmer home with stats/grid layout
export default function FarmerHomeScreen({
  navigation,
}: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const { user } = useAuth();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const screenWidth = useScreenWidth();
  const isCompact = screenWidth < COMPACT_BREAKPOINT;

  const theme = farmerTheme(isDark);
  const { totalProducts, totalPublications, activePublications } =
    useFarmerHomeStats();

  const { today } = useFormattedDate();

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  return (
    <ProfileDrawerProvider
      defaultName="Agricultor"
      defaultEmail="agricultor@rassa.com"
      onProfilePress={handleProfilePress}
    >
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
                  <ProfileDrawerTrigger />
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
      </View>
    </ProfileDrawerProvider>
  );
}

import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  ProfileDrawerProvider,
  ProfileDrawerTrigger,
} from '@/components/ProfileDrawer';
import StatCard from '@/components/StatCard';
import { colors } from '@/constants/colors';
import { useAdminColors } from '@/hooks/useAdminColors';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { getAdminStats } from '@/services/mock/dashboard';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList } from '@/types';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'AdminPanel'>;

interface Props {
  readonly navigation: Nav;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 24 },
  contentArea: { flex: 1, paddingTop: 48, paddingHorizontal: 20 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.06,
    textTransform: 'uppercase',
  },
  titleText: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  bellBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 10, paddingVertical: 24 },
  lookupCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  lookupTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 12,
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default function AdminPanelScreen({
  navigation,
}: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { bg, surface, fg, muted, border, brand } = useAdminColors();
  const accentBg = isDark ? colors.admActiveBgD : colors.admActiveBgL;
  const coralBg = isDark ? colors.admCoralBgD : colors.admCoralBgL;
  const pumpkinBg = isDark ? colors.admPumpkinBgD : colors.admPumpkinBgL;
  const coral = colors.brandRedCoral;
  const pumpkin = colors.accent;
  const stats = getAdminStats();
  const [showLookup, setShowLookup] = useState(false);
  const [lookupId, setLookupId] = useState('');
  const lookupNum = Number(lookupId);
  const isInvalid =
    lookupId.length > 0 &&
    (!Number.isFinite(lookupNum) ||
      !Number.isSafeInteger(lookupNum) ||
      lookupNum <= 0);

  const { today } = useFormattedDate();

  return (
    <ProfileDrawerProvider
      defaultName="Administrador"
      defaultEmail="admin@rassa.com"
      onProfilePress={() => navigation.navigate('AdminProfile')}
    >
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.container}>
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.contentArea}>
              {/* ═══ HEADER ═══ */}
              <View style={styles.headerRow}>
                <View>
                  <Text style={[styles.dateText, { color: muted }]}>
                    {today}
                  </Text>
                  <Text style={[styles.titleText, { color: fg }]}>Panel</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    testID="notification-bell"
                    style={({ pressed }) => [
                      styles.bellBtn,
                      {
                        backgroundColor: surface,
                        borderWidth: 1,
                        borderColor: border,
                        opacity: pressed ? 0.6 : 1,
                      },
                    ]}
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
              <View style={styles.statsRow}>
                <StatCard
                  icon="package-variant"
                  value={stats.totalProducts.toLocaleString()}
                  label="Productos"
                  iconBg={accentBg}
                  iconColor={brand}
                />
                <StatCard
                  icon="account-group"
                  value={stats.totalUsers.toLocaleString()}
                  label="Usuarios"
                  iconBg={coralBg}
                  iconColor={coral}
                />
                <Pressable
                  onPress={() => setShowLookup((v) => !v)}
                  style={{ flex: 1 }}
                >
                  <StatCard
                    icon="clipboard-list"
                    value={stats.totalOrders.toLocaleString()}
                    label="Pedidos"
                    iconBg={pumpkinBg}
                    iconColor={pumpkin}
                  />
                </Pressable>
              </View>

              {showLookup ? (
                <View
                  style={[
                    styles.lookupCard,
                    { backgroundColor: surface, borderColor: border },
                  ]}
                >
                  <Text style={[styles.lookupTitle, { color: fg }]}>
                    Buscar historial de pedido
                  </Text>
                  <TextInput
                    placeholder="ID del pedido"
                    placeholderTextColor={muted}
                    value={lookupId}
                    onChangeText={setLookupId}
                    keyboardType="number-pad"
                    style={[
                      styles.input,
                      {
                        backgroundColor: bg,
                        color: fg,
                        borderColor: isInvalid ? colors.brandRedCoral : border,
                      },
                    ]}
                  />
                  {isInvalid ? (
                    <Text
                      style={[
                        styles.errorText,
                        { color: colors.brandRedCoral },
                      ]}
                    >
                      Ingresá un ID de pedido válido (número positivo)
                    </Text>
                  ) : null}
                  <Pressable
                    onPress={() => {
                      const id = Number(lookupId);
                      if (
                        Number.isFinite(id) &&
                        Number.isSafeInteger(id) &&
                        id > 0
                      ) {
                        navigation.navigate('OrderDetail', { orderId: id });
                        setShowLookup(false);
                        setLookupId('');
                      }
                    }}
                    style={[styles.submitBtn, { backgroundColor: brand }]}
                  >
                    <Text
                      style={[
                        styles.submitBtnText,
                        { color: colors.iconWhite },
                      ]}
                    >
                      Ver historial
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </View>
    </ProfileDrawerProvider>
  );
}

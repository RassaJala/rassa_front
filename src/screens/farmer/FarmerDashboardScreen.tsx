import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '@/constants/colors';
import { usePublicaciones } from '@/hooks/usePublications';
import type { Publicacion, PublicacionEstado } from '@/services/publications';
import { useTheme } from '@/store/ThemeContext';
import type { FarmerStackParamList } from '@/types';

type Nav = NativeStackNavigationProp<FarmerStackParamList, 'FarmerDashboard'>;

interface Props {
  readonly navigation: Nav;
}

type TabKey = 'borrador' | 'publicado' | 'cerrado';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'borrador', label: 'Borradores', icon: 'file-document-outline' },
  { key: 'publicado', label: 'Publicadas', icon: 'check-circle-outline' },
  { key: 'cerrado', label: 'Cerradas', icon: 'lock-outline' },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function StatusBadge({
  estado,
  isDark,
}: {
  estado: PublicacionEstado;
  isDark: boolean;
}): React.JSX.Element {
  const map: Record<
    PublicacionEstado,
    { bg: string; fg: string; label: string }
  > = {
    borrador: {
      bg: isDark ? 'rgba(242,169,0,0.15)' : 'rgba(242,169,0,0.1)',
      fg: '#F2A900',
      label: 'Borrador',
    },
    publicado: {
      bg: isDark ? 'rgba(74,138,99,0.15)' : 'rgba(36,86,60,0.1)',
      fg: '#4A8A63',
      label: 'Publicado',
    },
    cerrado: {
      bg: isDark ? 'rgba(156,163,175,0.15)' : 'rgba(107,114,128,0.1)',
      fg: '#6B7280',
      label: 'Cerrado',
    },
    cancelado: {
      bg: isDark ? 'rgba(232,74,74,0.15)' : 'rgba(222,57,58,0.1)',
      fg: '#DE393A',
      label: 'Cancelado',
    },
  };
  const c = map[estado] ?? map.borrador;
  return (
    <View
      style={{
        backgroundColor: c.bg,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: c.fg }}>
        {c.label}
      </Text>
    </View>
  );
}

function PublicationCard({
  pub,
  isDark,
  onPress,
}: {
  pub: Publicacion;
  isDark: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const border = isDark ? '#353D35' : '#E2E6DF';
  const productCount = pub.productos?.length ?? 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: border,
        padding: 16,
        marginBottom: 10,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: fg,
              marginBottom: 2,
            }}
          >
            Semana {pub.semana}
          </Text>
          <Text style={{ fontSize: 13, color: muted }}>
            {formatDate(pub.fecha_publicacion)}
          </Text>
        </View>
        <StatusBadge estado={pub.estado} isDark={isDark} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginTop: 4,
        }}
      >
        <MaterialCommunityIcons
          name="package-variant"
          size={16}
          color={muted}
        />
        <Text style={{ fontSize: 13, color: muted }}>
          {productCount} {productCount === 1 ? 'producto' : 'productos'}
        </Text>
      </View>

      {pub.estado === 'borrador' ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginTop: 8,
          }}
        >
          <MaterialCommunityIcons
            name="pencil-outline"
            size={14}
            color="#F2A900"
          />
          <Text
            style={{ fontSize: 12, color: colors.warning, fontWeight: '500' }}
          >
            Toca para editar
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function EmptyState({
  isDark,
  tab,
}: {
  isDark: boolean;
  tab: TabKey;
}): React.JSX.Element {
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const msgs: Record<TabKey, string> = {
    borrador: 'No hay borradores. Creá una nueva publicación.',
    publicado: 'No hay publicaciones activas.',
    cerrado: 'No hay publicaciones cerradas.',
  };
  return (
    <View
      style={{
        alignItems: 'center',
        paddingVertical: 48,
        paddingHorizontal: 24,
      }}
    >
      <MaterialCommunityIcons
        name="clipboard-text-outline"
        size={48}
        color={muted}
      />
      <Text
        style={{
          fontSize: 15,
          color: muted,
          textAlign: 'center',
          marginTop: 12,
        }}
      >
        {msgs[tab]}
      </Text>
    </View>
  );
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function FarmerDashboardScreen({
  navigation,
}: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>('borrador');

  const { data, isLoading, refetch, isRefetching } =
    usePublicaciones(activeTab);

  const publications = data?.data?.results ?? [];

  const bg = isDark ? '#1A211B' : '#F5F7F0';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const border = isDark ? '#353D35' : '#E2E6DF';
  const brand = isDark ? '#4A8A63' : '#24563C';
  const coral = '#DE393A';

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: 100,
          paddingHorizontal: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={brand}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '700',
                letterSpacing: -0.3,
                color: fg,
              }}
            >
              Publicaciones
            </Text>
            <Text style={{ fontSize: 14, color: muted, marginTop: 2 }}>
              Gestioná tus publicaciones semanales
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {Platform.OS !== 'web' && (
              <Pressable
                onPress={() => navigation.navigate('PublicationWizard', {})}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: coral,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={24}
                  color={colors.iconWhite}
                />
              </Pressable>
            )}
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: surface,
                borderWidth: 1,
                borderColor: border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <MaterialCommunityIcons name="arrow-left" size={22} color={fg} />
            </Pressable>
          </View>
        </View>

        {/* Tabs */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
            padding: 3,
            marginBottom: 20,
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: isActive ? brand : colors.transparent,
                }}
              >
                <MaterialCommunityIcons
                  name={
                    tab.icon as keyof typeof MaterialCommunityIcons.glyphMap
                  }
                  size={16}
                  color={isActive ? colors.iconWhite : muted}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: isActive ? colors.iconWhite : muted,
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <ActivityIndicator size="large" color={brand} />
          </View>
        ) : publications.length === 0 ? (
          <EmptyState isDark={isDark} tab={activeTab} />
        ) : (
          publications.map((pub) => (
            <PublicationCard
              key={pub.id_publicacion}
              pub={pub}
              isDark={isDark}
              onPress={() =>
                navigation.navigate('PublicationWizard', {
                  publicacionId: pub.id_publicacion,
                })
              }
            />
          ))
        )}
      </ScrollView>

      {/* FAB — new publication (web only) */}
      {Platform.OS === 'web' && (
        <Pressable
          onPress={() => navigation.navigate('PublicationWizard', {})}
          style={({ pressed }) => ({
            position: 'absolute',
            bottom: insets.bottom + 24,
            left: 20,
            right: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: coral,
            borderRadius: 16,
            paddingVertical: 16,
            opacity: pressed ? 0.7 : 1,
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
          })}
        >
          <MaterialCommunityIcons
            name="plus"
            size={20}
            color={colors.iconWhite}
          />
          <Text
            style={{ fontSize: 15, fontWeight: '600', color: colors.iconWhite }}
          >
            Nueva publicación
          </Text>
        </Pressable>
      )}
    </View>
  );
}

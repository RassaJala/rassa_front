import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { colors, themeColors } from '@/constants/colors';
import { usePublicaciones } from '@/hooks/usePublications';
import type { Publicacion, PublicacionEstado } from '@/services/publications';
import { useTheme } from '@/store/ThemeContext';
import type { FarmerStackParamList } from '@/types';
import { parseLocalDate } from '@/utils/date';

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
  const d = parseLocalDate(iso);
  return d === null
    ? iso
    : d.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

const STATUS_LABELS: Record<PublicacionEstado, string> = {
  borrador: 'Borrador',
  publicado: 'Publicado',
  cerrado: 'Cerrado',
  cancelado: 'Cancelado',
};

function StatusBadge({
  estado,
  isDark,
}: {
  estado: PublicacionEstado;
  isDark: boolean;
}): React.JSX.Element {
  const theme = themeColors(isDark);
  const bgMap: Record<PublicacionEstado, string> = {
    borrador: theme.statusBorradorBg,
    publicado: theme.statusPublicadoBg,
    cerrado: theme.statusCerradoBg,
    cancelado: theme.statusCanceladoBg,
  };
  const fgMap: Record<PublicacionEstado, string> = {
    borrador: theme.statusBorradorFg,
    publicado: theme.statusPublicadoFg,
    cerrado: theme.statusCerradoFg,
    cancelado: theme.statusCanceladoFg,
  };

  const cBg = bgMap[estado] ?? bgMap.borrador;
  const cFg = fgMap[estado] ?? fgMap.borrador;
  const label = STATUS_LABELS[estado] ?? 'Borrador';

  return (
    <View
      style={{
        backgroundColor: cBg,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: cFg }}>
        {label}
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
  const theme = themeColors(isDark);
  const fg = theme.fg;
  const muted = theme.muted;
  const surface = theme.surface;
  const border = theme.border;
  const accentBg = theme.accentBg;
  const subtleBg = theme.subtleBg;
  const brand = theme.brand;
  const productCount = pub.productos?.length ?? 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: surface,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: border,
        padding: 16,
        marginBottom: 16,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          backgroundColor: subtleBg,
          borderRadius: 12,
          padding: 16,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: accentBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="calendar" size={24} color={brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: fg }}>
              Semana {pub.semana}
            </Text>
            <Text style={{ fontSize: 13, color: muted }}>
              {formatDate(pub.fecha_publicacion)}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: fg,
                marginBottom: 2,
              }}
            >
              {productCount} {productCount === 1 ? 'producto' : 'productos'}
            </Text>
            <Text style={{ fontSize: 13, color: muted }}>
              {STATUS_LABELS[pub.estado]}
            </Text>
          </View>
          <StatusBadge estado={pub.estado} isDark={isDark} />
        </View>

        {pub.estado === 'borrador' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              borderWidth: 1,
              borderColor: brand,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
              alignSelf: 'flex-start',
            }}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={14}
              color={brand}
            />
            <Text style={{ fontSize: 12, color: brand, fontWeight: '600' }}>
              Editar
            </Text>
          </View>
        ) : null}
      </View>
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
  const muted = themeColors(isDark).muted;
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

export default function FarmerDashboardScreen({
  navigation,
}: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>('borrador');

  const { data, isLoading, isError, refetch, isRefetching } =
    usePublicaciones(activeTab);

  const publications = data?.data?.results ?? [];

  const theme = themeColors(isDark);
  const bg = isDark ? theme.bg : theme.segBg;
  const fg = theme.fg;
  const muted = theme.muted;
  const surface = theme.surface;
  const border = theme.border;
  const brand = theme.brand;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: Math.max(insets.bottom, 24),
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
                  backgroundColor: surface,
                  borderWidth: 1,
                  borderColor: border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <MaterialCommunityIcons name="plus" size={24} color={fg} />
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

        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <ActivityIndicator size="large" color={brand} />
          </View>
        ) : isError ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
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
              Error al cargar publicaciones.
            </Text>
            <Pressable
              onPress={() => void refetch()}
              style={{
                marginTop: 12,
                paddingVertical: 8,
                paddingHorizontal: 20,
                borderRadius: 8,
                backgroundColor: brand,
              }}
            >
              <Text style={{ color: colors.iconWhite, fontWeight: '600' }}>
                Reintentar
              </Text>
            </Pressable>
          </View>
        ) : publications.length === 0 ? (
          <EmptyState isDark={isDark} tab={activeTab} />
        ) : (
          publications.map((pub) => (
            <PublicationCard
              key={pub.id_publicacion}
              pub={pub}
              isDark={isDark}
              onPress={() => {
                if (pub.estado !== 'borrador') {
                  Alert.alert(
                    'No se puede editar',
                    'Solo se pueden editar publicaciones en estado borrador. Las ya publicadas o cerradas no se pueden modificar.',
                    [{ text: 'OK' }],
                  );
                  return;
                }
                navigation.navigate('PublicationWizard', {
                  publicacionId: pub.id_publicacion,
                });
              }}
            />
          ))
        )}
      </ScrollView>

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
            backgroundColor: colors.brandRedCoral,
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

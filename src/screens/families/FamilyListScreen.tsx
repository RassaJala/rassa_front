import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import { colors } from '@/constants/colors';
import { fetchFamilies } from '@/services/families';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList, Family } from '@/types';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'FamilyList'>;

// ── Family card ───────────────────────────────────────────

interface FamilyCardProps {
  readonly family: Family;
  readonly isDark: boolean;
  readonly onPress: () => void;
}

function FamilyCard({
  family,
  isDark,
  onPress,
}: FamilyCardProps): React.JSX.Element {
  const surface = isDark ? '#263028' : '#FFFFFF';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#353D35' : '#E2E6DF';
  const accentBg = isDark ? '#353D35' : '#F5F7F0';
  const highlightColor = '#E46C38';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: border,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      {/* Ícono circular neutro */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: accentBg,
        }}
      >
        <MaterialCommunityIcons name="account-group" size={22} color={muted} />
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 16, fontWeight: '600', color: fg }}
          numberOfLines={1}
        >
          {family.nombre_familia}
        </Text>
        {family.jefe_nombre ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              marginTop: 3,
            }}
          >
            <MaterialCommunityIcons name="star" size={12} color={highlightColor} />
            <Text style={{ fontSize: 13, color: highlightColor, fontWeight: '500' }}>
              {family.jefe_nombre}
            </Text>
          </View>
        ) : (
          <Text style={{ fontSize: 13, color: muted, marginTop: 3 }}>
            Sin jefe asignado
          </Text>
        )}
        {family.detalle_familia ? (
          <Text
            style={{ fontSize: 12, color: muted, marginTop: 2 }}
            numberOfLines={1}
          >
            {family.detalle_familia}
          </Text>
        ) : null}
      </View>

      {/* Chevron */}
      <MaterialCommunityIcons name="chevron-right" size={22} color={muted} />
    </TouchableOpacity>
  );
}

// ── Sub-states ────────────────────────────────────────────

interface StateViewProps {
  readonly bg: string;
  readonly muted: string;
}

function UnauthorizedView({ bg, muted }: StateViewProps): React.JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        paddingHorizontal: 24,
      }}
    >
      <MaterialCommunityIcons name="lock-outline" size={48} color={muted} />
      <Text
        style={{ marginTop: 16, textAlign: 'center', fontSize: 16, color: muted }}
      >
        No tienes permisos para acceder a esta sección.
      </Text>
    </View>
  );
}

function LoadingView({ bg, brand }: { bg: string; brand: string }): React.JSX.Element {
  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}
    >
      <ActivityIndicator size="large" color={brand} />
    </View>
  );
}

interface ErrorViewProps extends StateViewProps {
  readonly brand: string;
  readonly onRefetch: () => void;
}

function ErrorView({ bg, muted, brand, onRefetch }: ErrorViewProps): React.JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        paddingHorizontal: 24,
      }}
    >
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={48}
        color={muted}
      />
      <Text
        style={{ marginTop: 16, textAlign: 'center', fontSize: 16, color: muted }}
      >
        Error al cargar las familias.
      </Text>
      <Pressable
        onPress={onRefetch}
        style={{
          marginTop: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: brand,
          borderRadius: 12,
          paddingHorizontal: 24,
          paddingVertical: 12,
        }}
      >
        <MaterialCommunityIcons name="refresh" size={18} color={colors.iconWhite} />
        <Text style={{ fontWeight: '600', color: colors.iconWhite }}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

function EmptyView({ muted }: { muted: string }): React.JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
      }}
    >
      <MaterialCommunityIcons
        name="account-group-outline"
        size={64}
        color={muted}
      />
      <Text
        style={{
          marginTop: 16,
          textAlign: 'center',
          fontSize: 20,
          fontWeight: '700',
          color: muted,
        }}
      >
        No hay familias
      </Text>
      <Text
        style={{ marginTop: 4, textAlign: 'center', fontSize: 14, color: muted }}
      >
        Crea una familia para comenzar.
      </Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────

export default function FamilyListScreen(): React.JSX.Element {
  const { user } = useAuth();
  const { colorScheme } = useTheme();
  const navigation = useNavigation<Nav>();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? '#1A211B' : '#F5F7F0';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const brand = isDark ? '#4A8A63' : '#24563C';

  const {
    data: families,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<Family[]>({
    queryKey: ['families'],
    queryFn: fetchFamilies,
    staleTime: 30_000,
  });

  if (user?.role !== 'admin') {
    return <UnauthorizedView bg={bg} muted={muted} />;
  }

  if (isLoading) {
    return <LoadingView bg={bg} brand={brand} />;
  }

  if (isError) {
    return <ErrorView bg={bg} muted={muted} brand={brand} onRefetch={() => void refetch()} />;
  }

  const isEmpty = !families || families.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header — igual que CrudListScreen */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 60,
          paddingBottom: 4,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: -0.02,
            color: fg,
          }}
        >
          Familias
        </Text>
        <Text style={{ fontSize: 14, color: muted, marginTop: 2 }}>
          {(families ?? []).length}{' '}
          {(families ?? []).length === 1 ? 'familia registrada' : 'familias registradas'}
        </Text>
      </View>

      {isEmpty ? (
        <EmptyView muted={muted} />
      ) : (
        <FlatList
          data={families}
          keyExtractor={(item) => String(item.id_familia)}
          contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={brand}
            />
          }
          renderItem={({ item }) => (
            <FamilyCard
              family={item}
              isDark={isDark}
              onPress={() =>
                navigation.navigate('FamilyDetail', {
                  familyId: item.id_familia,
                })
              }
            />
          )}
        />
      )}

      {/* FAB Coral — igual que el resto de la app */}
      <Pressable
        style={({ pressed }) => ({
          position: 'absolute',
          bottom: 28,
          right: 24,
          borderRadius: 999,
          backgroundColor: colors.brandRedCoral,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
          opacity: pressed ? 0.85 : 1,
        })}
        onPress={() => navigation.navigate('FamilyForm')}
      >
        <MaterialCommunityIcons name="plus" size={28} color={colors.iconWhite} />
      </Pressable>
    </View>
  );
}

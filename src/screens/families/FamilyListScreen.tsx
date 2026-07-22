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
import { fetchFamilies, fetchFamiliesTrash } from '@/services/families';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList, Family } from '@/types';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'FamilyList'>;

// ── Family card ───────────────────────────────────────────

interface FamilyCardProps {
  readonly family: Family;
  readonly isDark: boolean;
  readonly isTrash?: boolean;
  readonly onPress: () => void;
  readonly onRestore?: () => void;
  readonly onPermanentDelete?: () => void;
}

function FamilyCard({
  family,
  isDark,
  isTrash,
  onPress,
  onRestore,
  onPermanentDelete,
}: FamilyCardProps): React.JSX.Element {
  const surface = isDark ? colors.brandInk : colors.surface;
  const fg = isDark ? colors.background : colors.text;
  const muted = isDark ? colors.mutedDark : colors.textSecondary;
  const border = isDark ? colors.brandInk : colors.border;
  const accentBg = isDark ? colors.iconDark : colors.background;
  const brand = isDark ? colors.brandPrimaryDark : colors.brandPrimary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isTrash}
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
        <MaterialCommunityIcons
          name={isTrash ? 'delete-restore' : 'account-group'}
          size={22}
          color={isTrash ? colors.brandOrange : muted}
        />
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 16, fontWeight: '600', color: fg }}
          numberOfLines={1}
        >
          {family.nombre_familia}
        </Text>
        {isTrash ? (
          <Text
            style={{ fontSize: 13, color: colors.brandOrange, marginTop: 2 }}
          >
            Familia inactiva (en papelera)
          </Text>
        ) : family.jefe_nombre ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              marginTop: 3,
            }}
          >
            <MaterialCommunityIcons
              name="star"
              size={12}
              color={colors.brandOrange}
            />
            <Text
              style={{
                fontSize: 13,
                color: colors.brandOrange,
                fontWeight: '500',
              }}
            >
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

      {/* Acciones */}
      {isTrash ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={onRestore}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hitSlop={6}
          >
            <MaterialCommunityIcons name="restore" size={16} color={brand} />
          </Pressable>
          <Pressable
            onPress={onPermanentDelete}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hitSlop={6}
          >
            <MaterialCommunityIcons
              name="delete-forever"
              size={16}
              color={colors.brandRedCoral}
            />
          </Pressable>
        </View>
      ) : (
        <MaterialCommunityIcons name="chevron-right" size={22} color={muted} />
      )}
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
        style={{
          marginTop: 16,
          textAlign: 'center',
          fontSize: 16,
          color: muted,
        }}
      >
        No tienes permisos para acceder a esta sección.
      </Text>
    </View>
  );
}

function LoadingView({
  bg,
  brand,
}: {
  bg: string;
  brand: string;
}): React.JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
      }}
    >
      <ActivityIndicator size="large" color={brand} />
    </View>
  );
}

interface ErrorViewProps extends StateViewProps {
  readonly brand: string;
  readonly onRefetch: () => void;
}

function ErrorView({
  bg,
  muted,
  brand,
  onRefetch,
}: ErrorViewProps): React.JSX.Element {
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
        style={{
          marginTop: 16,
          textAlign: 'center',
          fontSize: 16,
          color: muted,
        }}
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
        <MaterialCommunityIcons
          name="refresh"
          size={18}
          color={colors.iconWhite}
        />
        <Text style={{ fontWeight: '600', color: colors.iconWhite }}>
          Reintentar
        </Text>
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
        style={{
          marginTop: 4,
          textAlign: 'center',
          fontSize: 14,
          color: muted,
        }}
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

  const bg = isDark ? colors.iconDark : colors.background;
  const surface = isDark ? colors.brandInk : colors.surface;
  const fg = isDark ? colors.background : colors.text;
  const muted = isDark ? colors.mutedDark : colors.textSecondary;
  const border = isDark ? colors.brandInk : colors.border;
  const brand = isDark ? colors.brandPrimaryDark : colors.brandPrimary;

  const [showTrash, setShowTrash] = React.useState(false);

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

  const { data: trashFamilies, refetch: refetchTrash } = useQuery<Family[]>({
    queryKey: ['families', 'trash'],
    queryFn: fetchFamiliesTrash,
    staleTime: 30_000,
  });

  if (user?.role !== 'admin') {
    return <UnauthorizedView bg={bg} muted={muted} />;
  }

  if (isLoading) {
    return <LoadingView bg={bg} brand={brand} />;
  }

  if (isError) {
    return (
      <ErrorView
        bg={bg}
        muted={muted}
        brand={brand}
        onRefetch={() => void refetch()}
      />
    );
  }

  const currentList = showTrash ? (trashFamilies ?? []) : (families ?? []);
  const isEmpty = currentList.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 60,
          paddingBottom: 4,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              letterSpacing: -0.02,
              color: fg,
            }}
          >
            {showTrash ? 'Papelera' : 'Familias'}
          </Text>
          <Text style={{ fontSize: 14, color: muted, marginTop: 2 }}>
            {currentList.length}{' '}
            {showTrash
              ? currentList.length === 1
                ? 'familia inactiva'
                : 'familias inactivas'
              : currentList.length === 1
                ? 'familia registrada'
                : 'familias registradas'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Botón de Papelera */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: border,
              backgroundColor: surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => {
              setShowTrash((prev) => !prev);
              void refetchTrash();
            }}
          >
            <MaterialCommunityIcons
              name={showTrash ? 'account-group' : 'trash-can-outline'}
              size={20}
              color={showTrash ? colors.brandRedCoral : muted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={{
              borderRadius: 10,
              backgroundColor: colors.brandRedCoral,
              paddingHorizontal: 16,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => navigation.navigate('FamilyForm')}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.iconWhite,
              }}
            >
              Agregar
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isEmpty ? (
        <EmptyView muted={muted} />
      ) : (
        <FlatList
          data={currentList}
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
              isTrash={showTrash}
              onPress={() =>
                navigation.navigate('FamilyDetail', {
                  familyId: item.id_familia,
                })
              }
            />
          )}
        />
      )}
    </View>
  );
}

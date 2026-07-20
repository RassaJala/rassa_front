import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
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

export default function FamilyListScreen(): React.JSX.Element {
  const { user } = useAuth();
  const { colorScheme } = useTheme();
  const navigation = useNavigation<Nav>();
  const isDark = colorScheme === 'dark';

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
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6 dark:bg-gray-950">
        <MaterialCommunityIcons
          name="lock-outline"
          size={48}
          color={colors.iconMuted}
        />
        <Text className="mt-4 text-center text-base text-gray-500 dark:text-gray-400">
          No tienes permisos para acceder a esta sección.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">
        <ActivityIndicator size="large" color={colors.brandRedCoral} />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6 dark:bg-gray-950">
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={colors.brandRedCoral}
        />
        <Text className="mt-4 text-center text-base text-gray-500 dark:text-gray-400">
          Error al cargar las familias.
        </Text>
        <Pressable
          className="mt-4 rounded-xl bg-brand-green-forest px-6 py-3"
          onPress={() => void refetch()}
        >
          <Text className="font-semibold text-white">Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const bg = isDark ? '#1A211B' : '#F5F7F0';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#353D35' : '#E2E6DF';
  const brand = isDark ? '#4A8A63' : '#24563C';
  const coral = '#DE393A';

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 60,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: border,
          backgroundColor: surface,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => ({
            marginRight: 12,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={fg}
          />
        </Pressable>
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: fg,
          }}
        >
          Familias
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={brand}
          />
        }
      >
        {(families ?? []).length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <MaterialCommunityIcons
              name="account-group-outline"
              size={64}
              color={muted}
            />
            <Text
              style={{
                marginTop: 16,
                textAlign: 'center',
                fontSize: 18,
                fontWeight: '600',
                color: muted,
              }}
            >
              No hay familias registradas
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
        ) : (
          (families ?? []).map((family) => (
            <Pressable
              key={family.id_familia}
              style={({ pressed }) => ({
                marginBottom: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: surface,
                padding: 16,
                opacity: pressed ? 0.9 : 1,
              })}
              onPress={() => {
                navigation.navigate('FamilyDetail', {
                  familyId: family.id_familia,
                });
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: fg }}>
                    {family.nombre_familia}
                  </Text>
                  {family.jefe_nombre ? (
                    <Text style={{ marginTop: 4, fontSize: 14, color: muted }}>
                      Jefe: {family.jefe_nombre}
                    </Text>
                  ) : null}
                  {family.detalle_familia ? (
                    <Text
                      style={{ marginTop: 2, fontSize: 13, color: muted }}
                      numberOfLines={1}
                    >
                      {family.detalle_familia}
                    </Text>
                  ) : null}
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={muted}
                />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Pressable
        style={({ pressed }) => ({
          position: 'absolute',
          bottom: 24,
          right: 24,
          borderRadius: 999,
          backgroundColor: coral,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 5,
          opacity: pressed ? 0.9 : 1,
        })}
        onPress={() => {
          navigation.navigate('FamilyForm');
        }}
      >
        <MaterialCommunityIcons
          name="plus"
          size={28}
          color="#ffffff"
        />
      </Pressable>
    </View>
  );
}

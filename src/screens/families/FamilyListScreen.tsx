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

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <View className="flex-row items-center border-b border-gray-200 bg-white px-5 pb-4 pt-[60px] dark:border-gray-800 dark:bg-gray-900">
        <Pressable
          onPress={() => navigation.goBack()}
          className="mr-3 active:opacity-60"
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={isDark ? colors.iconWhite : colors.iconDark}
          />
        </Pressable>
        <Text className="text-xl font-bold text-brand-ink dark:text-gray-100">
          Familias
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
          />
        }
      >
        {(families ?? []).length === 0 ? (
          <View className="items-center pt-20">
            <MaterialCommunityIcons
              name="account-group-outline"
              size={64}
              color={colors.iconMuted}
            />
            <Text className="mt-4 text-center text-lg font-semibold text-gray-400 dark:text-gray-500">
              No hay familias registradas
            </Text>
            <Text className="mt-1 text-center text-sm text-gray-400 dark:text-gray-500">
              Crea una familia para comenzar.
            </Text>
          </View>
        ) : (
          (families ?? []).map((family) => (
            <Pressable
              key={family.id_familia}
              className={`mb-3 rounded-2xl border p-4 ${
                isDark
                  ? 'border-gray-800 bg-gray-900'
                  : 'border-gray-200 bg-white'
              }`}
              onPress={() => {
                navigation.navigate('FamilyDetail', {
                  familyId: family.id_familia,
                });
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900 dark:text-white">
                    {family.nombre_familia}
                  </Text>
                  {family.jefe_nombre ? (
                    <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Jefe: {family.jefe_nombre}
                    </Text>
                  ) : null}
                  {family.detalle_familia ? (
                    <Text
                      className="mt-0.5 text-sm text-gray-400 dark:text-gray-500"
                      numberOfLines={1}
                    >
                      {family.detalle_familia}
                    </Text>
                  ) : null}
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={isDark ? colors.textTertiary : colors.textSecondary}
                />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Pressable
        className="absolute bottom-6 right-6 rounded-full bg-brand-red-coral p-4 shadow-lg"
        onPress={() => {
          navigation.navigate('FamilyForm');
        }}
      >
        <MaterialCommunityIcons
          name="plus"
          size={28}
          color={colors.iconWhite}
        />
      </Pressable>
    </View>
  );
}

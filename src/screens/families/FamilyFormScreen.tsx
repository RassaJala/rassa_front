import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { colors } from '@/constants/colors';
import { createFamily, fetchFamily, updateFamily } from '@/services/families';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList, Family } from '@/types';

type Route = RouteProp<AdminStackParamList, 'FamilyForm'>;

export default function FamilyFormScreen(): React.JSX.Element {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const { colorScheme } = useTheme();
  const queryClient = useQueryClient();
  const isDark = colorScheme === 'dark';

  const familyId = route.params?.familyId;
  const isEditing = familyId !== undefined;

  const { data: existingFamily, isLoading: loadingFamily } = useQuery<Family>({
    queryKey: ['family', familyId],
    queryFn: () => fetchFamily(Number(familyId)),
    enabled: isEditing,
    staleTime: 30_000,
  });

  const [nombre, setNombre] = useState('');
  const [detalle, setDetalle] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  // Populate form when editing
  React.useEffect(() => {
    if (existingFamily) {
      setNombre(existingFamily.nombre_familia);
      setDetalle(existingFamily.detalle_familia ?? '');
    }
  }, [existingFamily]);

  const createMutation = useMutation({
    mutationFn: (payload: {
      nombre_familia: string;
      detalle_familia?: string;
    }) => createFamily(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['families'] });
      navigation.goBack();
    },
    onError: () => {
      setServerError('Error al crear la familia.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      nombre_familia: string;
      detalle_familia?: string;
    }) => updateFamily(Number(familyId), payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['families'] });
      void queryClient.invalidateQueries({ queryKey: ['family', familyId] });
      navigation.goBack();
    },
    onError: () => {
      setServerError('Error al actualizar la familia.');
    },
  });

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const trimmedNombre = nombre.trim();

    if (!trimmedNombre) {
      errors.nombre = 'El nombre es obligatorio.';
    } else if (trimmedNombre.length < 3) {
      errors.nombre = 'El nombre debe tener al menos 3 caracteres.';
    }

    setFieldErrors(errors);
    setServerError('');
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (): void => {
    if (!validate()) return;

    const payload = {
      nombre_familia: nombre.trim(),
      ...(detalle.trim() ? { detalle_familia: detalle.trim() } : {}),
    };

    if (isEditing) {
      void updateMutation.mutateAsync(payload);
    } else {
      void createMutation.mutateAsync(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEditing && loadingFamily) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">
        <ActivityIndicator size="large" color={colors.brandRedCoral} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-4 pt-4 dark:bg-gray-950">
      <View
        className={`rounded-2xl border p-5 ${
          isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
        }`}
      >
        {/* ── Nombre ──────────────────────────────────── */}
        <Text className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
          Nombre de la familia *
        </Text>
        <TextInput
          className={`rounded-xl border px-4 py-3 text-base ${
            fieldErrors.nombre
              ? 'border-brand-red-coral'
              : isDark
                ? 'border-gray-700 bg-gray-800 text-white'
                : 'border-gray-300 bg-gray-50 text-gray-900'
          }`}
          placeholder="Ej. Familia López"
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
          value={nombre}
          onChangeText={(text) => {
            setNombre(text);
            if (fieldErrors.nombre) {
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.nombre;
                return next;
              });
            }
          }}
          editable={!isSaving}
        />
        {fieldErrors.nombre ? (
          <Text className="mt-1 text-xs text-brand-red-coral">
            {fieldErrors.nombre}
          </Text>
        ) : null}

        {/* ── Detalle ─────────────────────────────────── */}
        <Text className="mb-1.5 mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
          Detalle
        </Text>
        <TextInput
          className={`rounded-xl border px-4 py-3 text-base ${
            isDark
              ? 'border-gray-700 bg-gray-800 text-white'
              : 'border-gray-300 bg-gray-50 text-gray-900'
          }`}
          placeholder="Descripción opcional"
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          value={detalle}
          onChangeText={setDetalle}
          editable={!isSaving}
        />

        {/* ── Server error ────────────────────────────── */}
        {serverError ? (
          <View className="mt-3 flex-row items-center">
            <MaterialCommunityIcons
              name="alert-circle"
              size={16}
              color={colors.brandRedCoral}
            />
            <Text className="ml-1.5 text-sm text-brand-red-coral">
              {serverError}
            </Text>
          </View>
        ) : null}

        {/* ── Actions ─────────────────────────────────── */}
        <View className="mt-6 flex-row justify-end gap-3">
          <Pressable
            className="rounded-xl bg-gray-200 px-5 py-2.5 dark:bg-gray-700"
            onPress={() => navigation.goBack()}
            disabled={isSaving}
          >
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Cancelar
            </Text>
          </Pressable>
          <Pressable
            className="rounded-xl bg-brand-green-forest px-5 py-2.5"
            onPress={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.iconWhite} />
            ) : (
              <Text className="text-sm font-semibold text-white">
                {isEditing ? 'Guardar cambios' : 'Crear familia'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

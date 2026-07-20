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

interface FormHeaderProps {
  readonly isEditing: boolean;
  readonly isDark: boolean;
  readonly onBack: () => void;
}

function FormHeader({
  isEditing,
  isDark,
  onBack,
}: FormHeaderProps): React.JSX.Element {
  return (
    <View className="flex-row items-center border-b border-gray-200 bg-white px-5 pb-4 pt-[60px] dark:border-gray-800 dark:bg-gray-900">
      <Pressable
        onPress={onBack}
        className="mr-3 active:opacity-60"
      >
        <MaterialCommunityIcons
          name="arrow-left"
          size={24}
          color={isDark ? colors.iconWhite : colors.iconDark}
        />
      </Pressable>
      <Text className="text-xl font-bold text-brand-ink dark:text-gray-100">
        {isEditing ? 'Editar familia' : 'Nueva familia'}
      </Text>
    </View>
  );
}

function LoadingIndicator(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">
      <ActivityIndicator size="large" color={colors.brandRedCoral} />
    </View>
  );
}

interface FormFieldsProps {
  readonly isDark: boolean;
  readonly nombre: string;
  readonly onChangeNombre: (val: string) => void;
  readonly detalle: string;
  readonly onChangeDetalle: (val: string) => void;
  readonly fieldErrors: Record<string, string>;
  readonly clearFieldError: (field: string) => void;
  readonly serverError: string;
  readonly isSaving: boolean;
  readonly isEditing: boolean;
  readonly onCancel: () => void;
  readonly onSubmit: () => void;
}

function FormFields({
  isDark,
  nombre,
  onChangeNombre,
  detalle,
  onChangeDetalle,
  fieldErrors,
  clearFieldError,
  serverError,
  isSaving,
  isEditing,
  onCancel,
  onSubmit,
}: FormFieldsProps): React.JSX.Element {
  const surface = isDark ? '#263028' : '#FFFFFF';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const border = isDark ? '#353D35' : '#E2E6DF';
  const btnBg = isDark ? '#353D35' : '#F5F7F0';
  const textInputBg = isDark ? '#1A211B' : '#F9FAF6';
  const coral = '#DE393A';

  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: surface,
        padding: 20,
      }}
    >
      {/* ── Nombre ──────────────────────────────────── */}
      <Text style={{ marginBottom: 6, fontSize: 14, fontWeight: '500', color: fg }}>
        Nombre de la familia *
      </Text>
      <TextInput
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: fieldErrors.nombre ? coral : border,
          backgroundColor: textInputBg,
          paddingHorizontal: 16,
          paddingVertical: 12,
          fontSize: 16,
          color: fg,
        }}
        placeholder="Ej. Familia López"
        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
        value={nombre}
        onChangeText={(text) => {
          onChangeNombre(text);
          if (fieldErrors.nombre) {
            clearFieldError('nombre');
          }
        }}
        editable={!isSaving}
      />
      {fieldErrors.nombre ? (
        <Text style={{ marginTop: 4, fontSize: 12, color: coral }}>
          {fieldErrors.nombre}
        </Text>
      ) : null}

      {/* ── Detalle ─────────────────────────────────── */}
      <Text style={{ marginBottom: 6, marginTop: 16, fontSize: 14, fontWeight: '500', color: fg }}>
        Detalle
      </Text>
      <TextInput
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: border,
          backgroundColor: textInputBg,
          paddingHorizontal: 16,
          paddingVertical: 12,
          fontSize: 16,
          color: fg,
          height: 80,
          textAlignVertical: 'top',
        }}
        placeholder="Descripción opcional"
        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
        multiline
        numberOfLines={3}
        value={detalle}
        onChangeText={onChangeDetalle}
        editable={!isSaving}
      />

      {/* ── Server error ────────────────────────────── */}
      {serverError ? (
        <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={16}
            color={coral}
          />
          <Text style={{ marginLeft: 6, fontSize: 14, color: coral }}>
            {serverError}
          </Text>
        </View>
      ) : null}

      {/* ── Actions ─────────────────────────────────── */}
      <View style={{ marginTop: 24, flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
        <Pressable
          style={({ pressed }) => ({
            borderRadius: 12,
            backgroundColor: btnBg,
            paddingHorizontal: 20,
            paddingVertical: 10,
            opacity: pressed ? 0.9 : 1,
          })}
          onPress={onCancel}
          disabled={isSaving}
        >
          <Text style={{ fontSize: 14, fontWeight: '500', color: fg }}>
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => ({
            borderRadius: 12,
            backgroundColor: coral,
            paddingHorizontal: 20,
            paddingVertical: 10,
            opacity: pressed ? 0.9 : 1,
          })}
          onPress={onSubmit}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-sm font-semibold text-white">
              {isEditing ? 'Guardar cambios' : 'Crear familia'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

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

  const handleSubmit = (): void => {
    const trimmedNombre = nombre.trim();
    if (!trimmedNombre) {
      setFieldErrors({ nombre: 'El nombre es obligatorio.' });
      setServerError('');
      return;
    }
    if (trimmedNombre.length < 3) {
      setFieldErrors({ nombre: 'El nombre debe tener al menos 3 caracteres.' });
      setServerError('');
      return;
    }

    setFieldErrors({});
    setServerError('');

    const payload = {
      nombre_familia: trimmedNombre,
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
    return <LoadingIndicator />;
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      <FormHeader
        isEditing={isEditing}
        isDark={isDark}
        onBack={() => navigation.goBack()}
      />

      <ScrollView className="flex-1 px-4 pt-4">
        <FormFields
          isDark={isDark}
          nombre={nombre}
          onChangeNombre={setNombre}
          detalle={detalle}
          onChangeDetalle={setDetalle}
          fieldErrors={fieldErrors}
          clearFieldError={(field) => {
            setFieldErrors((prev) => {
              const next = { ...prev };
              delete next[field];
              return next;
            });
          }}
          serverError={serverError}
          isSaving={isSaving}
          isEditing={isEditing}
          onCancel={() => navigation.goBack()}
          onSubmit={handleSubmit}
        />
      </ScrollView>
    </View>
  );
}

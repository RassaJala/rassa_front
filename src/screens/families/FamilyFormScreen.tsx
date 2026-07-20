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
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Pressable
        onPress={onBack}
        style={({ pressed }) => ({
          opacity: pressed ? 0.6 : 1,
        })}
        hitSlop={8}
      >
        <MaterialCommunityIcons
          name="arrow-left"
          size={24}
          color={fg}
        />
      </Pressable>
      <View>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: -0.02,
            color: fg,
          }}
        >
          {isEditing ? 'Editar familia' : 'Nueva familia'}
        </Text>
        <Text style={{ fontSize: 14, color: muted, marginTop: 2 }}>
          {isEditing
            ? 'Modifica los datos de la familia'
            : 'Completa los datos de la nueva familia'}
        </Text>
      </View>
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
  const errorColor = '#DE393A';

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
          borderColor: fieldErrors.nombre ? errorColor : border,
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
        <Text style={{ marginTop: 4, fontSize: 12, color: errorColor }}>
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
            color={errorColor}
          />
          <Text style={{ marginLeft: 6, fontSize: 14, color: errorColor }}>
            {serverError}
          </Text>
        </View>
      ) : null}

      {/* ── Actions ─────────────────────────────────── */}
      <View style={{ marginTop: 24, gap: 10 }}>
        <Pressable
          style={({ pressed }) => ({
            borderRadius: 14,
            backgroundColor: colors.brandRedCoral,
            height: 50,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6,
            opacity: pressed ? 0.85 : 1,
          })}
          onPress={onSubmit}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size={16} color={colors.iconWhite} />
          ) : null}
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.iconWhite }}>
            {isEditing ? 'Guardar cambios' : 'Crear familia'}
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => ({
            borderRadius: 14,
            height: 44,
            borderWidth: 1.5,
            borderColor: border,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? btnBg : 'transparent',
          })}
          onPress={onCancel}
          disabled={isSaving}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>
            Cancelar
          </Text>
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

  const bg = isDark ? '#1A211B' : '#F5F7F0';

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <FormHeader
        isEditing={isEditing}
        isDark={isDark}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 0 }}
        keyboardShouldPersistTaps="handled"
      >
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

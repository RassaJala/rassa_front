import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { colors, themeColors } from '@/constants/colors';
import { useUserSearch } from '@/hooks/useUserSearch';
import {
  createFamilyWithHead,
  fetchFamily,
  updateFamily,
} from '@/services/families';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList, Family, SearchUserResult } from '@/types';

type Route = RouteProp<AdminStackParamList, 'FamilyForm'>;

interface JefeSearchFieldProps {
  readonly isDark: boolean;
  readonly errorColor: string;
  readonly fieldError: string | undefined;
  readonly saving: boolean;
  readonly jefeQuery: string;
  readonly selectedJefe: SearchUserResult | null;
  readonly searchingJefe: boolean;
  readonly jefeResults: SearchUserResult[];
  readonly onQueryChange: (text: string) => void;
  readonly onSelect: (user: SearchUserResult) => void;
  readonly onClear: () => void;
}

function JefeSearchField({
  isDark,
  errorColor,
  fieldError,
  saving,
  jefeQuery,
  selectedJefe,
  searchingJefe,
  jefeResults,
  onQueryChange,
  onSelect,
  onClear,
}: JefeSearchFieldProps): React.JSX.Element {
  const t = themeColors(isDark);
  return (
    <>
      <Text
        style={{
          marginBottom: 6,
          marginTop: 16,
          fontSize: 14,
          fontWeight: '500',
          color: t.fg,
        }}
      >
        Jefe de familia *
      </Text>
      <View style={{ position: 'relative' }}>
        <TextInput
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: fieldError ? errorColor : t.border,
            backgroundColor: t.input,
            paddingLeft: 16,
            paddingRight: (selectedJefe ?? jefeQuery) ? 40 : 16,
            paddingVertical: 12,
            fontSize: 16,
            color: t.fg,
          }}
          placeholder="Buscar por nombre o correo..."
          placeholderTextColor={t.muted}
          value={jefeQuery}
          onChangeText={onQueryChange}
          editable={!saving}
        />
        {(selectedJefe ?? jefeQuery) ? (
          <Pressable
            onPress={onClear}
            style={{ position: 'absolute', right: 12, top: 14 }}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={20}
              color={t.muted}
            />
          </Pressable>
        ) : null}
      </View>

      {searchingJefe ? (
        <ActivityIndicator
          size="small"
          color={t.brand}
          style={{ marginTop: 8 }}
        />
      ) : null}

      {jefeResults.length > 0 ? (
        <View
          style={{
            marginTop: 4,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.surface,
            maxHeight: 180,
            overflow: 'hidden',
          }}
        >
          <ScrollView nestedScrollEnabled>
            {jefeResults.map((user) => (
              <TouchableOpacity
                key={user.id_usuario}
                activeOpacity={0.7}
                onPress={() => onSelect(user)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: t.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: t.fg,
                  }}
                  numberOfLines={1}
                >
                  {user.nombre} {user.apellido_paterno}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: t.muted,
                    marginTop: 1,
                  }}
                  numberOfLines={1}
                >
                  {user.email}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {fieldError ? (
        <Text style={{ marginTop: 4, fontSize: 12, color: errorColor }}>
          {fieldError}
        </Text>
      ) : null}
    </>
  );
}

async function handleSubmit(
  trimmedNombre: string,
  detalle: string,
  isEditing: boolean,
  selectedJefe: SearchUserResult | null,
  familyId: number | undefined,
  setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setServerError: (msg: string) => void,
  setSaving: (v: boolean) => void,
  queryClient: ReturnType<typeof useQueryClient>,
  navigation: { goBack: () => void },
): Promise<void> {
  if (!trimmedNombre) {
    setFieldErrors({ nombre: 'El nombre es obligatorio.' });
    setServerError('');
    return;
  }
  if (trimmedNombre.length < 3) {
    setFieldErrors({
      nombre: 'El nombre debe tener al menos 3 caracteres.',
    });
    setServerError('');
    return;
  }
  if (!isEditing && !selectedJefe) {
    setFieldErrors({ jefe: 'Debes seleccionar un jefe de familia.' });
    setServerError('');
    return;
  }

  setFieldErrors({});
  setServerError('');
  setSaving(true);

  try {
    if (isEditing) {
      const payload = {
        nombre_familia: trimmedNombre,
        ...(detalle.trim() ? { detalle_familia: detalle.trim() } : {}),
      };
      await updateFamily(Number(familyId), payload);
      void queryClient.invalidateQueries({ queryKey: ['families'] });
      void queryClient.invalidateQueries({ queryKey: ['family', familyId] });
      navigation.goBack();
    } else if (selectedJefe) {
      await createFamilyWithHead(
        {
          nombre_familia: trimmedNombre,
          ...(detalle.trim() ? { detalle_familia: detalle.trim() } : {}),
        },
        selectedJefe.id_usuario,
      );
      void queryClient.invalidateQueries({ queryKey: ['families'] });
      navigation.goBack();
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Error al guardar la familia.';
    setServerError(message);
  } finally {
    setSaving(false);
  }
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

  const [jefeQuery, setJefeQuery] = useState('');
  const [selectedJefe, setSelectedJefe] = useState<SearchUserResult | null>(
    null,
  );
  const {
    results: jefeResults,
    setResults: setJefeResults,
    isSearching: searchingJefe,
  } = useUserSearch(jefeQuery, selectedJefe);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (existingFamily) {
      setNombre(existingFamily.nombre_familia);
      setDetalle(existingFamily.detalle_familia ?? '');
    }
  }, [existingFamily]);

  const handleSelectJefe = (user: SearchUserResult): void => {
    setSelectedJefe(user);
    setJefeQuery(`${user.nombre} ${user.apellido_paterno} (${user.email})`);
    setJefeResults([]);
  };

  const handleClearJefe = (): void => {
    setJefeQuery('');
    setSelectedJefe(null);
    setJefeResults([]);
  };

  const clearFieldError = (field: string): void => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const onSubmit = (): void => {
    const trimmedNombre = nombre.trim();
    void handleSubmit(
      trimmedNombre,
      detalle,
      isEditing,
      selectedJefe,
      familyId,
      setFieldErrors,
      setServerError,
      setSaving,
      queryClient,
      navigation,
    );
  };

  const t = useMemo(() => themeColors(isDark), [isDark]);

  if (isEditing && loadingFamily) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">
        <ActivityIndicator size="large" color={colors.brandRedCoral} />
      </View>
    );
  }

  const errorColor = colors.brandRedCoral;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* ── Header ──────────────────────────────────── */}
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
        <View>
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              letterSpacing: -0.02,
              color: t.fg,
            }}
          >
            {isEditing ? 'Editar familia' : 'Familias'}
          </Text>
          <Text style={{ fontSize: 14, color: t.muted, marginTop: 2 }}>
            {isEditing
              ? 'Modifica los datos de la familia'
              : 'Crea una nueva familia'}
          </Text>
        </View>
      </View>

      {/* ── Segmented control ──────────────────────── */}
      {!isEditing ? (
        <View
          style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}
        >
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: isDark ? colors.admSegBgD : colors.admSegBgL,
              borderRadius: 10,
              padding: 3,
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: colors.transparent,
                alignItems: 'center',
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: t.muted,
                  letterSpacing: 0.01,
                }}
              >
                📋 Lista
              </Text>
            </TouchableOpacity>
            <View
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: t.surface,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: t.fg,
                  letterSpacing: 0.01,
                }}
              >
                ➕ Nuevo
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 0 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Form card ──────────────────────────────── */}
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.surface,
            padding: 20,
          }}
        >
          {/* Nombre */}
          <Text
            style={{
              marginBottom: 6,
              fontSize: 14,
              fontWeight: '500',
              color: t.fg,
            }}
          >
            Nombre de la familia *
          </Text>
          <TextInput
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: fieldErrors.nombre ? errorColor : t.border,
              backgroundColor: t.input,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              color: t.fg,
            }}
            placeholder="Ej. Familia López"
            placeholderTextColor={t.muted}
            value={nombre}
            onChangeText={(text) => {
              setNombre(text);
              if (fieldErrors.nombre) clearFieldError('nombre');
            }}
            editable={!saving}
          />
          {fieldErrors.nombre ? (
            <Text style={{ marginTop: 4, fontSize: 12, color: errorColor }}>
              {fieldErrors.nombre}
            </Text>
          ) : null}

          {/* Jefe de familia (solo creación) */}
          {!isEditing ? (
            <JefeSearchField
              isDark={isDark}
              errorColor={errorColor}
              fieldError={fieldErrors.jefe}
              saving={saving}
              jefeQuery={jefeQuery}
              selectedJefe={selectedJefe}
              searchingJefe={searchingJefe}
              jefeResults={jefeResults}
              onQueryChange={(text) => {
                setJefeQuery(text);
                if (fieldErrors.jefe) clearFieldError('jefe');
              }}
              onSelect={handleSelectJefe}
              onClear={handleClearJefe}
            />
          ) : null}

          {/* Detalle */}
          <Text
            style={{
              marginBottom: 6,
              marginTop: 16,
              fontSize: 14,
              fontWeight: '500',
              color: t.fg,
            }}
          >
            Detalle
          </Text>
          <TextInput
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: t.border,
              backgroundColor: t.input,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              color: t.fg,
              height: 80,
              textAlignVertical: 'top',
            }}
            placeholder="Descripción opcional"
            placeholderTextColor={t.muted}
            multiline
            numberOfLines={3}
            value={detalle}
            onChangeText={setDetalle}
            editable={!saving}
          />

          {/* Server error */}
          {serverError ? (
            <View
              style={{
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
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

          {/* Actions */}
          <View style={{ marginTop: 24, gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={{
                borderRadius: 10,
                backgroundColor: colors.brandRedCoral,
                height: 42,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                opacity: saving ? 0.6 : 1,
              }}
              onPress={onSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size={16} color={colors.iconWhite} />
              ) : null}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: colors.iconWhite,
                }}
              >
                {isEditing ? 'Guardar cambios' : 'Crear familia'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={{
                borderRadius: 10,
                height: 40,
                borderWidth: 1.5,
                borderColor: t.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => navigation.goBack()}
              disabled={saving}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: t.fg }}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

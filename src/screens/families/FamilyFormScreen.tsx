import React, { useEffect, useState } from 'react';
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

import { colors } from '@/constants/colors';
import {
  addFamilyMember,
  assignFamilyHead,
  createFamily,
  deleteFamily,
  fetchFamily,
  searchUsers,
  updateFamily,
} from '@/services/families';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList, Family, SearchUserResult } from '@/types';

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
  readonly isEditing: boolean;
  readonly nombre: string;
  readonly onChangeNombre: (val: string) => void;
  readonly detalle: string;
  readonly onChangeDetalle: (val: string) => void;
  readonly jefeQuery: string;
  readonly onChangeJefeQuery: (val: string) => void;
  readonly jefeResults: SearchUserResult[];
  readonly selectedJefe: SearchUserResult | null;
  readonly searchingJefe: boolean;
  readonly onSelectJefe: (user: SearchUserResult) => void;
  readonly onClearJefe: () => void;
  readonly fieldErrors: Record<string, string>;
  readonly clearFieldError: (field: string) => void;
  readonly serverError: string;
  readonly isSaving: boolean;
  readonly onCancel: () => void;
  readonly onSubmit: () => void;
}

function FormFields({
  isDark,
  isEditing,
  nombre,
  onChangeNombre,
  detalle,
  onChangeDetalle,
  jefeQuery,
  onChangeJefeQuery,
  jefeResults,
  selectedJefe,
  searchingJefe,
  onSelectJefe,
  onClearJefe,
  fieldErrors,
  clearFieldError,
  serverError,
  isSaving,
  onCancel,
  onSubmit,
}: FormFieldsProps): React.JSX.Element {
  const surface = isDark ? '#263028' : '#FFFFFF';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#353D35' : '#E2E6DF';
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

      {/* ── Jefe de familia (solo al crear) ──────────── */}
      {!isEditing ? (
        <>
          <Text style={{ marginBottom: 6, marginTop: 16, fontSize: 14, fontWeight: '500', color: fg }}>
            Jefe de familia *
          </Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: fieldErrors.jefe ? errorColor : border,
                backgroundColor: textInputBg,
                paddingLeft: 16,
                paddingRight: selectedJefe ?? jefeQuery ? 40 : 16,
                paddingVertical: 12,
                fontSize: 16,
                color: fg,
              }}
              placeholder="Buscar por nombre o correo..."
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              value={jefeQuery}
              onChangeText={(text) => {
                onChangeJefeQuery(text);
                if (fieldErrors.jefe) {
                  clearFieldError('jefe');
                }
              }}
              editable={!isSaving}
            />
            {selectedJefe ?? jefeQuery ? (
              <Pressable
                onPress={onClearJefe}
                style={{ position: 'absolute', right: 12, top: 14 }}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={20}
                  color={muted}
                />
              </Pressable>
            ) : null}
          </View>

          {searchingJefe ? (
            <ActivityIndicator size="small" color={colors.brandPrimary} style={{ marginTop: 8 }} />
          ) : null}

          {jefeResults.length > 0 ? (
            <View
              style={{
                marginTop: 4,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: surface,
                maxHeight: 180,
                overflow: 'hidden',
              }}
            >
              <ScrollView nestedScrollEnabled>
                {jefeResults.map((user) => (
                  <TouchableOpacity
                    key={user.id_usuario}
                    activeOpacity={0.7}
                    onPress={() => onSelectJefe(user)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: border,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: fg }} numberOfLines={1}>
                      {user.nombre} {user.apellido_paterno}
                    </Text>
                    <Text style={{ fontSize: 12, color: muted, marginTop: 1 }} numberOfLines={1}>
                      {user.email}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {fieldErrors.jefe ? (
            <Text style={{ marginTop: 4, fontSize: 12, color: errorColor }}>
              {fieldErrors.jefe}
            </Text>
          ) : null}
        </>
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
            opacity: isSaving ? 0.6 : 1,
          }}
          onPress={onSubmit}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size={16} color={colors.iconWhite} />
          ) : null}
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.iconWhite }}>
            {isEditing ? 'Guardar cambios' : 'Crear familia'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          style={{
            borderRadius: 10,
            height: 40,
            borderWidth: 1.5,
            borderColor: border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={onCancel}
          disabled={isSaving}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: fg }}>
            Cancelar
          </Text>
        </TouchableOpacity>
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

  const [jefeQuery, setJefeQuery] = useState('');
  const [jefeResults, setJefeResults] = useState<SearchUserResult[]>([]);
  const [selectedJefe, setSelectedJefe] = useState<SearchUserResult | null>(null);
  const [searchingJefe, setSearchingJefe] = useState(false);
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  React.useEffect(() => {
    if (existingFamily) {
      setNombre(existingFamily.nombre_familia);
      setDetalle(existingFamily.detalle_familia ?? '');
    }
  }, [existingFamily]);

  // Debounced jefe search
  useEffect(() => {
    const trimmed = jefeQuery.trim();
    const shouldSearch = trimmed.length >= 2 && !selectedJefe;
    if (!shouldSearch) {
      setJefeResults([]);
      return;
    }

    const delay = setTimeout(async () => {
      setSearchingJefe(true);
      try {
        const data = await searchUsers(trimmed);
        setJefeResults(data);
      } catch {
        setJefeResults([]);
      } finally {
        setSearchingJefe(false);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [jefeQuery, selectedJefe]);

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

  const handleSubmit = async (): Promise<void> => {
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
      } else {
        // 3-step create: family → add member → assign head
        const payload = {
          nombre_familia: trimmedNombre,
          ...(detalle.trim() ? { detalle_familia: detalle.trim() } : {}),
        };
        const jefeId = selectedJefe.id_usuario;
        const created = await createFamily(payload);
        const newFamilyId = created.id_familia;

        try {
          await addFamilyMember(jefeId, newFamilyId);
          await assignFamilyHead(newFamilyId, jefeId);
        } catch {
          // Rollback: delete the family if adding head fails
          try {
            await deleteFamily(newFamilyId);
          } catch {
            // Rollback failed silently
          }
          throw new Error('Error al asignar el jefe de familia.');
        }

        void queryClient.invalidateQueries({ queryKey: ['families'] });
        navigation.goBack();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar la familia.';
      setServerError(message);
    } finally {
      setSaving(false);
    }
  };

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
          isEditing={isEditing}
          nombre={nombre}
          onChangeNombre={setNombre}
          detalle={detalle}
          onChangeDetalle={setDetalle}
          jefeQuery={jefeQuery}
          onChangeJefeQuery={setJefeQuery}
          jefeResults={jefeResults}
          selectedJefe={selectedJefe}
          searchingJefe={searchingJefe}
          onSelectJefe={handleSelectJefe}
          onClearJefe={handleClearJefe}
          fieldErrors={fieldErrors}
          clearFieldError={(field) => {
            setFieldErrors((prev) => {
              const next = { ...prev };
              delete next[field];
              return next;
            });
          }}
          serverError={serverError}
          isSaving={saving}
          onCancel={() => navigation.goBack()}
          onSubmit={handleSubmit}
        />
      </ScrollView>
    </View>
  );
}

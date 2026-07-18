import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Toast from '@/components/Toast';
import api from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList, ApiResponse } from '@/types';
import { extractFieldErrors } from '@/utils/apiError';

// ── Configuration ──────────────────────────────────────────

interface CrudFieldConfig {
  readonly name: string;
  readonly label: string;
  readonly placeholder?: string;
  readonly multiline?: boolean;
  readonly numberOfLines?: number;
}

interface CrudConfig<T extends { nombre: string; estado: boolean }> {
  readonly queryKey: readonly string[];
  readonly endpoint: string;
  readonly entityName: string;
  readonly entityNamePlural: string;
  readonly entityNamePluralLower: string;
  readonly getId: (item: T) => number;
  readonly fields: readonly CrudFieldConfig[];
  readonly errorFieldKeys: readonly string[];
  readonly emptyIcon: string;
  readonly emptyText: string;
  readonly emptyDescription: string;
  readonly headerTitle: string;
  readonly loadingErrorText: string;
  readonly newDialogTitle: string;
  readonly editDialogTitle: string;
  readonly deleteDialogTitle: string;
  readonly deleteConfirmText: (item: T) => string;
  readonly toastCreated: (name: string) => string;
  readonly toastEdited: (name: string) => string;
  readonly toastDeleted: (name: string) => string;
  readonly toastActivated: (name: string) => string;
  readonly toastDeactivated: (name: string) => string;
  readonly statusLabels: { readonly active: string; readonly inactive: string };
  readonly renderListItem?: (
    item: T,
    actions: {
      readonly onEdit: () => void;
      readonly onToggleStatus: () => void;
      readonly onDelete: () => void;
    },
  ) => React.JSX.Element;
  readonly validate: (formValues: Record<string, string>) => string | null;
  readonly extraDuplicateCheck?: (
    formValues: Record<string, string>,
    items: T[] | undefined,
    editingItem: T | null,
  ) => string | null;
  readonly queryParams?: Record<string, string>;
  readonly trashScreenName?:
    'CategoryTrash' | 'UnitTrash' | 'MunicipioTrash' | 'LocalidadTrash';
  readonly trashScreenParams?: Record<string, unknown>;
  readonly comingSoon?: boolean;
}

// ── Navigation type ────────────────────────────────────────

type CrudScreenName =
  'CategoryList' | 'UnitList' | 'MunicipioList' | 'LocalidadList';

interface CrudListScreenProps<T extends { nombre: string; estado: boolean }> {
  readonly config: CrudConfig<T>;
  readonly navigation: NativeStackNavigationProp<
    AdminStackParamList,
    CrudScreenName
  >;
}

// ── Default list item renderer ─────────────────────────────

function defaultRenderListItem<T extends { nombre: string; estado: boolean }>(
  item: T,
  _getSecondValue: (item: T) => string | null,
  config: CrudConfig<T>,
  actions: {
    readonly onEdit: () => void;
    readonly onToggleStatus: () => void;
    readonly onDelete: () => void;
  },
  colors: {
    surface: string;
    border: string;
    fg: string;
    muted: string;
    brand: string;
    iconWhite: string;
    errorColor: string;
  },
  isDark: boolean,
): React.JSX.Element {
  const secondField = config.fields[1];
  const secondValue = secondField ? _getSecondValue(item) : null;
  const accentBg = isDark ? 'rgba(74,138,99,0.12)' : 'rgba(36,86,60,0.07)';

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      {/* Icono */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: accentBg,
        }}
      >
        <MaterialCommunityIcons
          name={item.estado ? 'check-circle-outline' : 'circle-outline'}
          size={20}
          color={item.estado ? colors.brand : colors.muted}
        />
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 16, fontWeight: '600', color: colors.fg }}
          numberOfLines={1}
        >
          {item.nombre}
        </Text>
        {secondValue ? (
          <Text
            style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}
            numberOfLines={1}
          >
            {secondValue}
          </Text>
        ) : null}
      </View>

      {/* Acciones — icon buttons 36×36 tipo iOS */}
      <Pressable
        onPress={actions.onEdit}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        hitSlop={6}
      >
        <MaterialCommunityIcons
          name="pencil-outline"
          size={16}
          color={colors.brand}
        />
      </Pressable>
      <Pressable
        onPress={actions.onToggleStatus}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        hitSlop={6}
      >
        <MaterialCommunityIcons
          name={item.estado ? 'pause-circle-outline' : 'play-circle-outline'}
          size={16}
          color={colors.muted}
        />
      </Pressable>
      <Pressable
        onPress={actions.onDelete}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        hitSlop={6}
      >
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={16}
          color={colors.errorColor}
        />
      </Pressable>
    </View>
  );
}

// ── Helpers ────────────────────────────────────────────────

function fieldValueFor<T extends { nombre: string; estado: boolean }>(
  name: string,
  item: T,
): string {
  if (name === 'descripcion' && 'descripcion' in item) {
    return String((item as Record<string, unknown>).descripcion ?? '');
  }
  if (name === 'abreviatura' && 'abreviatura' in item) {
    return String((item as Record<string, unknown>).abreviatura ?? '');
  }
  return '';
}

// ── Helper API fetcher ─────────────────────────────────────

async function fetchCrudItems<T>(
  endpoint: string,
  queryParams?: Record<string, string>,
): Promise<T[]> {
  const url = queryParams
    ? `${endpoint}?${new URLSearchParams(queryParams).toString()}`
    : endpoint;
  const { data } = await api.get<
    T[] | { results: T[] } | ApiResponse<{ results: T[] }>
  >(url);

  if (Array.isArray(data)) return data;
  if ('data' in data && typeof data.data === 'object' && data.data !== null) {
    if (Array.isArray(data.data)) return data.data;
    const inner = data.data as { results?: T[] };
    if (Array.isArray(inner.results)) return inner.results;
  }
  if ('results' in data && Array.isArray(data.results)) return data.results;

  return [];
}

// ── Component ──────────────────────────────────────────────

export default function CrudListScreen<
  T extends { nombre: string; estado: boolean },
>({ config, navigation }: CrudListScreenProps<T>): React.JSX.Element | null {
  // ── Hooks must be called unconditionally, in same order every render ──
  const { user } = useAuth();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? '#1A211B' : '#F5F7F0';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#353D35' : '#E2E6DF';
  const brand = isDark ? '#4A8A63' : '#24563C';
  const iconWhite = '#FFFFFF';
  const errorColor = '#DE393A';
  const segmentedBg = isDark ? '#263028' : '#E8ECE4';
  const transparent = 'transparent';
  const errorBg = isDark ? '#3D2023' : '#FDEDEE';
  const modalOverlay = 'rgba(0,0,0,0.4)';
  const netInfo = useNetInfo();
  const queryClient = useQueryClient();

  // ── List data ──────────────────────────────────────────────
  const {
    data: items,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<T[]>({
    queryKey: config.queryParams
      ? [...config.queryKey, JSON.stringify(config.queryParams)]
      : [...config.queryKey],
    queryFn: () => fetchCrudItems<T>(config.endpoint, config.queryParams),
    staleTime: 30_000,
    retry: 2,
  });

  // ── Tab state ──────────────────────────────────────────────
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<{
    fields: Record<string, string>;
    general: string | null;
  }>({ fields: {}, general: null });

  // ── Toast state ────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // ── Delete sheet state ─────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  // ── Toggle confirm state ────────────────────────────────────
  const [toggleTarget, setToggleTarget] = useState<T | null>(null);

  // ── Helpers ────────────────────────────────────────────────
  const toast = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      setToastMessage(message);
      setToastType(type);
    },
    [],
  );

  const invalidateAndGoToList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [...config.queryKey] });
    setTab('list');
    setEditingItem(null);
    setFormValues({});
    setFormErrors({ fields: {}, general: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config.queryKey is stable from parent
  }, [queryClient]);

  // ── Mutations ──────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const url = config.queryParams
        ? `${config.endpoint}?${new URLSearchParams(config.queryParams).toString()}`
        : config.endpoint;
      const { data } = await api.post<ApiResponse<T>>(url, payload);

      return data;
    },
    onError: (error: unknown) => {
      setFormErrors(extractFieldErrors(error, [...config.errorFieldKeys]));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: number;
    } & Record<string, unknown>) => {
      const { data } = await api.patch<ApiResponse<T>>(
        `${config.endpoint}${id}/`,
        payload,
      );

      return data;
    },
    onError: (error: unknown) => {
      setFormErrors(extractFieldErrors(error, [...config.errorFieldKeys]));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`${config.endpoint}${id}/`);
    },
  });

  // ── Handlers ───────────────────────────────────────────────
  const startNew = useCallback(() => {
    const initial: Record<string, string> = {};
    for (const field of config.fields) {
      initial[field.name] = '';
    }
    setEditingItem(null);
    setFormValues(initial);
    setFormErrors({ fields: {}, general: null });
    setTab('form');
  }, [config.fields]);

  const startEdit = useCallback(
    (item: T) => {
      const initial: Record<string, string> = {};
      for (const field of config.fields) {
        initial[field.name] =
          field.name === 'nombre'
            ? item.nombre
            : fieldValueFor(field.name, item);
      }
      setEditingItem(item);
      setFormValues(initial);
      setFormErrors({ fields: {}, general: null });
      setTab('form');
    },
    [config.fields],
  );

  const switchToList = useCallback(() => {
    setTab('list');
    setEditingItem(null);
    const empty: Record<string, string> = {};
    for (const field of config.fields) {
      empty[field.name] = '';
    }
    setFormValues(empty);
    setFormErrors({ fields: {}, general: null });
  }, [config.fields]);

  const handleSave = useCallback(() => {
    // Per-field validation
    const validationError = config.validate(formValues);

    if (validationError) {
      setFormErrors({ fields: {}, general: validationError });

      return;
    }

    // Duplicate name check
    const trimmedName = (formValues.nombre ?? '').trim();
    const nameLower = trimmedName.toLocaleLowerCase();
    const isDuplicate = (items ?? []).some(
      (item) =>
        (item.nombre ?? '').toLocaleLowerCase() === nameLower &&
        (!editingItem || config.getId(item) !== config.getId(editingItem)),
    );

    if (isDuplicate) {
      setFormErrors({
        fields: {},
        general: `Ya existe ${config.entityName} con el nombre "${trimmedName}".`,
      });

      return;
    }

    // Extra duplicate check (e.g. abbreviation for units)
    if (config.extraDuplicateCheck) {
      const extraError = config.extraDuplicateCheck(
        formValues,
        items,
        editingItem,
      );

      if (extraError) {
        setFormErrors({ fields: {}, general: extraError });

        return;
      }
    }

    // Build payload
    const payload: Record<string, unknown> = {};

    for (const field of config.fields) {
      payload[field.name] = (formValues[field.name] ?? '').trim();
    }
    payload.estado = true;

    if (editingItem) {
      const { estado: _e, ...updatePayload } = payload;

      void _e; // suppress unused
      updateMutation.mutate(
        {
          id: config.getId(editingItem),
          ...updatePayload,
        },
        {
          onSuccess: () => {
            invalidateAndGoToList();
            toast(config.toastEdited(trimmedName));
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          invalidateAndGoToList();
          toast(config.toastCreated(trimmedName));
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config, navigation, toast, setForm* are stable refs
  }, [formValues, editingItem, items]);

  const handleToggleStatus = useCallback(
    (item: T) => {
      const newStatus = !item.estado;
      const action = newStatus ? 'activó' : 'desactivó';
      const name = item.nombre;

      updateMutation.mutate(
        {
          id: config.getId(item),
          estado: newStatus,
        },
        {
          onSuccess: () => {
            void queryClient.invalidateQueries({
              queryKey: [...config.queryKey],
            });
            toast(
              newStatus
                ? config.toastActivated(name)
                : config.toastDeactivated(name),
            );
          },
          onError: () => {
            toast(
              `Error al ${action} ${config.entityName} "${name}". Intenta de nuevo.`,
            );
          },
        },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- createMutation is intentionally excluded to avoid circular dep; config/navigation are stable
    [updateMutation, queryClient],
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function renderGuardView() {
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

  function renderComingSoonView() {
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
          name="wrench-clock-outline"
          size={64}
          color={muted}
        />
        <Text
          style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 24,
            fontWeight: '700',
            color: muted,
          }}
        >
          Funcionalidad en desarrollo
        </Text>
        <Text
          style={{
            marginTop: 8,
            textAlign: 'center',
            fontSize: 14,
            color: muted,
          }}
        >
          Esta sección estará disponible próximamente.
        </Text>
      </View>
    );
  }

  function renderLoadingView() {
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

  function renderErrorView() {
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
          {netInfo.isConnected === false
            ? 'Sin conexión a Internet. Verifica tu conexión.'
            : config.loadingErrorText}
        </Text>
        <Pressable
          onPress={() => void refetch()}
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
          <MaterialCommunityIcons name="refresh" size={18} color={iconWhite} />
          <Text style={{ fontWeight: '600', color: iconWhite }}>
            Reintentar
          </Text>
        </Pressable>
      </View>
    );
  }

  function renderListTab() {
    const empty = !items || items.length === 0;

    if (empty) {
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
            name={config.emptyIcon as 'folder-open-outline' | 'ruler'}
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
            {config.emptyText}
          </Text>
          <Text
            style={{
              marginTop: 4,
              textAlign: 'center',
              fontSize: 14,
              color: muted,
            }}
          >
            {config.emptyDescription}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={items}
        keyExtractor={(item) => String(config.getId(item))}
        contentContainerStyle={{ padding: 20, paddingBottom: 8, gap: 10 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={brand}
          />
        }
        renderItem={({ item }) =>
          config.renderListItem
            ? config.renderListItem(item, {
                onEdit: () => startEdit(item),
                onToggleStatus: () => setToggleTarget(item),
                onDelete: () => setDeleteTarget(item),
              })
            : defaultRenderListItem(
                item,
                (i) => {
                  const second = config.fields[1];
                  if (!second) return null;
                  const val = (i as Record<string, unknown>)[second.name];
                  return val != null ? String(val) : null;
                },
                config,
                {
                  onEdit: () => startEdit(item),
                  onToggleStatus: () => setToggleTarget(item),
                  onDelete: () => setDeleteTarget(item),
                },
                { surface, border, fg, muted, brand, iconWhite, errorColor },
                isDark,
              )
        }
        ListFooterComponent={null}
      />
    );
  }

  function renderFormTab() {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 18 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: fg }}>
            {editingItem
              ? `Editar ${config.entityName}`
              : `Nueva ${config.entityName}`}
          </Text>

          {formErrors.general ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 8,
                backgroundColor: errorBg,
                borderRadius: 12,
                padding: 12,
              }}
            >
              <MaterialCommunityIcons
                name="alert-circle"
                size={18}
                color={errorColor}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  lineHeight: 20,
                  color: errorColor,
                }}
              >
                {formErrors.general}
              </Text>
            </View>
          ) : null}

          {config.fields.map((field) => {
            const fieldErr = formErrors.fields[field.name];
            return (
              <View key={field.name} style={{ gap: 6 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    letterSpacing: 0.08,
                    textTransform: 'uppercase',
                    color: muted,
                  }}
                >
                  {field.label}
                </Text>
                <TextInput
                  value={formValues[field.name] ?? ''}
                  onChangeText={(text) => {
                    setFormValues((prev) => ({ ...prev, [field.name]: text }));
                    setFormErrors((prev) => ({
                      ...prev,
                      fields: { ...prev.fields, [field.name]: '' },
                      general: null,
                    }));
                  }}
                  placeholder={field.placeholder}
                  placeholderTextColor={muted}
                  multiline={field.multiline}
                  numberOfLines={
                    field.multiline ? (field.numberOfLines ?? 3) : 1
                  }
                  style={{
                    borderWidth: 1.5,
                    borderColor: fieldErr ? errorColor : border,
                    borderRadius: 12,
                    backgroundColor: surface,
                    color: fg,
                    fontSize: 15,
                    paddingHorizontal: 14,
                    height: field.multiline ? 80 : 46,
                    paddingTop: field.multiline ? 12 : 0,
                    textAlignVertical: field.multiline ? 'top' : 'center',
                  }}
                />
                {fieldErr ? (
                  <Text
                    style={{ fontSize: 12, color: errorColor, marginLeft: 4 }}
                  >
                    {fieldErr}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </ScrollView>

        <View
          style={{
            padding: 20,
            gap: 10,
            borderTopWidth: 1,
            borderTopColor: border,
          }}
        >
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
            style={{
              height: 50,
              borderRadius: 14,
              backgroundColor: errorColor,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            {isSaving ? (
              <ActivityIndicator size={16} color={iconWhite} />
            ) : null}
            <Text style={{ fontSize: 16, fontWeight: '600', color: iconWhite }}>
              Guardar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={switchToList}
            disabled={isSaving}
            activeOpacity={0.8}
            style={{
              height: 44,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  function renderContent() {
    const trashScreen = config.trashScreenName;
    const isFormActive = tab === 'form';

    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 60,
            paddingBottom: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {navigation.canGoBack() ? (
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={8}
                style={{ marginRight: 4 }}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={28}
                  color={fg}
                />
              </Pressable>
            ) : null}
            <Text
              style={{
                fontSize: 28,
                fontWeight: '700',
                letterSpacing: -0.02,
                color: fg,
              }}
            >
              {config.headerTitle}
            </Text>
          </View>
          {trashScreen ? (
            <Pressable
              onPress={() =>
                navigation.navigate(
                  trashScreen,
                  config.trashScreenParams as never,
                )
              }
              className="ml-auto h-11 w-11 items-center justify-center rounded-full active:opacity-80"
              hitSlop={12}
            >
              <MaterialCommunityIcons
                name="delete-restore"
                size={24}
                color={muted}
              />
            </Pressable>
          ) : null}
        </View>

        <View
          style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}
        >
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: segmentedBg,
              borderRadius: 10,
              padding: 3,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                if (!isFormActive) return;
                switchToList();
              }}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: isFormActive ? transparent : surface,
                alignItems: 'center',
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isFormActive ? muted : fg,
                  letterSpacing: 0.01,
                }}
              >
                📋 Lista
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (isFormActive) return;
                startNew();
              }}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: isFormActive ? surface : transparent,
                alignItems: 'center',
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isFormActive ? fg : muted,
                  letterSpacing: 0.01,
                }}
              >
                ➕ Nuevo
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {!isFormActive ? renderListTab() : renderFormTab()}

        <Modal
          visible={toggleTarget !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setToggleTarget(null)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: modalOverlay }}
            onPress={() => setToggleTarget(null)}
          />
          <View
            style={{
              backgroundColor: surface,
              borderRadius: 24,
              padding: 24,
              paddingBottom: 34,
              marginTop: 'auto',
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: errorBg,
                  marginBottom: 12,
                }}
              >
                <MaterialCommunityIcons
                  name={
                    toggleTarget?.estado
                      ? 'pause-circle-outline'
                      : 'play-circle-outline'
                  }
                  size={26}
                  color={errorColor}
                />
              </View>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '700',
                  color: fg,
                  textAlign: 'center',
                }}
              >
                {toggleTarget?.estado
                  ? `Desactivar "${toggleTarget?.nombre}"?`
                  : `Activar "${toggleTarget?.nombre}"?`}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: muted,
                  marginTop: 6,
                  textAlign: 'center',
                }}
              >
                {toggleTarget?.estado
                  ? 'El elemento se moverá a la papelera.'
                  : 'El elemento volverá a estar activo.'}
              </Text>
            </View>
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  if (toggleTarget) handleToggleStatus(toggleTarget);
                  setToggleTarget(null);
                }}
                activeOpacity={0.8}
                style={{
                  height: 50,
                  borderRadius: 14,
                  backgroundColor: errorColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{ fontSize: 16, fontWeight: '600', color: iconWhite }}
                >
                  {toggleTarget?.estado ? 'Desactivar' : 'Activar'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setToggleTarget(null)}
                activeOpacity={0.8}
                style={{
                  height: 44,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={deleteTarget !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setDeleteTarget(null)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: modalOverlay }}
            onPress={() => setDeleteTarget(null)}
          />
          <View
            style={{
              backgroundColor: surface,
              borderRadius: 24,
              padding: 24,
              paddingBottom: 34,
              marginTop: 'auto',
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: errorBg,
                  marginBottom: 12,
                }}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={26}
                  color={errorColor}
                />
              </View>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '700',
                  color: fg,
                  textAlign: 'center',
                }}
              >
                {deleteTarget ? config.deleteConfirmText(deleteTarget) : ''}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: muted,
                  marginTop: 6,
                  textAlign: 'center',
                }}
              >
                Esta acción no se puede deshacer.
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  if (!deleteTarget) return;
                  const id = config.getId(deleteTarget);
                  const name = deleteTarget.nombre;
                  deleteMutation.mutate(id, {
                    onSuccess: () => {
                      void queryClient.invalidateQueries({
                        queryKey: [...config.queryKey],
                      });
                      setDeleteTarget(null);
                      toast(config.toastDeleted(name));
                    },
                    onError: () => {
                      toast(
                        `Error al eliminar ${config.entityName} "${name}".`,
                        'error',
                      );
                      setDeleteTarget(null);
                    },
                  });
                }}
                disabled={isSaving || deleteMutation.isPending}
                activeOpacity={0.8}
                style={{
                  height: 50,
                  borderRadius: 14,
                  backgroundColor: errorColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                  opacity: isSaving || deleteMutation.isPending ? 0.6 : 1,
                }}
              >
                {isSaving || deleteMutation.isPending ? (
                  <ActivityIndicator size={16} color={iconWhite} />
                ) : null}
                <Text
                  style={{ fontSize: 16, fontWeight: '600', color: iconWhite }}
                >
                  Eliminar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
                activeOpacity={0.8}
                style={{
                  height: 44,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Toast
          visible={toastMessage !== null}
          message={toastMessage ?? ''}
          type={toastType}
          onDismiss={() => {
            setToastMessage(null);
            setToastType('success');
          }}
        />
      </View>
    );
  }

  // ── Early returns ──
  if (user?.role !== 'admin') return renderGuardView();
  if (config.comingSoon) return renderComingSoonView();
  if (isLoading) return renderLoadingView();
  if (isError) return renderErrorView();
  return renderContent();
}

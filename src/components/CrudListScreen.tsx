import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Sentry from '@sentry/react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Toast from '@/components/Toast';
import { colors } from '@/constants/colors';
import api from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList, ApiResponse } from '@/types';
import { extractFieldErrors } from '@/utils/apiError';
import { parseApiList } from '@/utils/apiResponse';

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
  readonly searchFields?: readonly string[];
  readonly queryParams?: Record<string, string>;
  readonly trashScreenName?:
    'CategoryTrash' | 'UnitTrash' | 'MunicipioTrash' | 'LocalidadTrash';
  readonly trashScreenParams?: Record<string, unknown>;
  readonly toggleEndpoint?: string;
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
      style={[
        styles.listItem,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* Icono */}
      <View
        style={[styles.listItemIcon, { backgroundColor: accentBg }]}
      >
        <MaterialCommunityIcons
          name={item.estado ? 'check-circle-outline' : 'circle-outline'}
          size={20}
          color={item.estado ? colors.brand : colors.muted}
        />
      </View>

      {/* Info */}
      <View style={styles.listItemInfo}>
        <Text
          style={[styles.listItemTitle, { color: colors.fg }]}
          numberOfLines={1}
        >
          {item.nombre}
        </Text>
        {secondValue ? (
          <Text
            style={[styles.listItemSubtitle, { color: colors.muted }]}
            numberOfLines={1}
          >
            {secondValue}
          </Text>
        ) : null}
      </View>

      {/* Acciones — icon buttons 36×36 tipo iOS */}
      <Pressable
        onPress={actions.onEdit}
        style={[styles.iconBtn, { borderColor: colors.border }]}
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
        style={[styles.iconBtn, { borderColor: colors.border }]}
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
        style={[styles.iconBtn, { borderColor: colors.border }]}
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

// ── Search / Filter types and helpers ──────────────────────

type StatusFilterValue = 'todos' | 'activos' | 'inactivos';
const STATUS_FILTERS: readonly StatusFilterValue[] = [
  'todos',
  'activos',
  'inactivos',
];
const FILTER_LABELS: Record<StatusFilterValue, string> = {
  todos: 'Todos',
  activos: 'Activos',
  inactivos: 'Inactivos',
};

interface FilterResult<T> {
  readonly items: T[];
  readonly excludedCount: number;
}

/**
 * Pure filter function — runs each item through search + status checks.
 * Invalid items are caught, logged, and excluded instead of crashing the list.
 * Returns filtered items plus a count of items excluded by error.
 */
function filterItems<T extends { nombre: string; estado: boolean }>(
  items: T[] | undefined,
  search: string,
  statusFilter: StatusFilterValue,
  searchFieldNames: readonly string[],
): FilterResult<T> {
  const normalizedSearch = search.toLowerCase().trim();
  let excludedCount = 0;

  const filtered = (items ?? []).filter((item) => {
    try {
      // Validate estado before using it
      if (typeof item.estado !== 'boolean') {
        console.warn(
          'CrudListScreen: estado is not boolean, unexpected:',
          item,
        );
      }

      const matchesSearch =
        !normalizedSearch ||
        searchFieldNames.some((fieldName) => {
          const value = (item as Record<string, unknown>)[fieldName];
          return String(value ?? '')
            .toLowerCase()
            .includes(normalizedSearch);
        });

      let matchesStatus: boolean;
      if (statusFilter === 'todos') {
        matchesStatus = true;
      } else if (statusFilter === 'activos') {
        matchesStatus = item.estado === true;
      } else {
        matchesStatus = item.estado === false;
      }

      return matchesSearch && matchesStatus;
    } catch (error) {
      excludedCount++;
      Sentry.captureException(error);
      console.warn(
        'CrudListScreen: error filtering item, excluding it:',
        item,
        error,
      );
      return false;
    }
  });

  return { items: filtered, excludedCount };
}

// ── Helper API fetcher ─────────────────────────────────────

async function fetchCrudItems<T>(
  endpoint: string,
  queryParams?: Record<string, string>,
): Promise<T[]> {
  const url = queryParams
    ? `${endpoint}?${new URLSearchParams(queryParams).toString()}`
    : endpoint;
  const { data } = await api.get<T[]>(url);

  return parseApiList<T>(data);
}

// ── Component ──────────────────────────────────────────────

export default function CrudListScreen<
  T extends { nombre: string; estado: boolean },
>({ config, navigation }: CrudListScreenProps<T>): React.JSX.Element | null {
  // ── Hooks must be called unconditionally, in same order every render ──
  const { user } = useAuth();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? colors.admBgD : colors.admBgL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const iconWhite = colors.iconWhite;
  const errorColor = colors.brandRedCoral;
  const segmentedBg = isDark ? colors.admSegBgD : colors.admSegBgL;
  const transparent = 'transparent';
  const errorBg = isDark ? colors.admCoralBgD : colors.admCoralBgL;
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

  // ── Search / Filter state ──────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermDebounced, setSearchTermDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('todos');

  // ── Delete sheet state ─────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  // ── Toggle confirm state ────────────────────────────────────
  const [toggleTarget, setToggleTarget] = useState<T | null>(null);

  // ── Debounce search term ────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setSearchTermDebounced(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── Filtered items ──────────────────────────────────────────
  // ponytail: fallback busca por nombre si no hay searchFields configurados
  const defaultFieldNames = useMemo(
    () => (config.fields[0] ? [config.fields[0].name] : ['nombre']),
    [config.fields],
  );
  const searchFieldNames = config.searchFields ?? defaultFieldNames;
  const { items: filteredItems, excludedCount } = useMemo(
    () =>
      filterItems(items, searchTermDebounced, statusFilter, searchFieldNames),
    [items, searchTermDebounced, statusFilter, searchFieldNames],
  );

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
    mutationFn: async (
      params: {
        id: number;
        url?: string;
      } & Record<string, unknown>,
    ) => {
      const { id, url, ...payload } = params;
      const patchUrl = url ?? `${config.endpoint}${id}/`;
      const { data } = await api.patch<ApiResponse<T>>(patchUrl, payload);

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
      const id = config.getId(item);
      const toggleUrl = config.toggleEndpoint
        ? `${config.endpoint}${id}/${config.toggleEndpoint}`
        : `${config.endpoint}${id}/`;

      updateMutation.mutate(
        {
          id,
          estado: newStatus,
          url: toggleUrl,
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
        style={[
          styles.centerFlex,
          { backgroundColor: bg, paddingHorizontal: 24 },
        ]}
      >
        <MaterialCommunityIcons name="lock-outline" size={48} color={muted} />
        <Text
          style={[styles.infoText, { color: muted }]}
        >
          No tienes permisos para acceder a esta sección.
        </Text>
      </View>
    );
  }

  function renderComingSoonView() {
    return (
      <View
        style={[
          styles.centerFlex,
          { backgroundColor: bg, paddingHorizontal: 24 },
        ]}
      >
        <MaterialCommunityIcons
          name="wrench-clock-outline"
          size={64}
          color={muted}
        />
        <Text
          style={[styles.comingSoonTitle, { color: muted }]}
        >
          Funcionalidad en desarrollo
        </Text>
        <Text
          style={[styles.comingSoonDesc, { color: muted }]}
        >
          Esta sección estará disponible próximamente.
        </Text>
      </View>
    );
  }

  function renderLoadingView() {
    return (
      <View
        style={[styles.centerFlex, { backgroundColor: bg }]}
      >
        <ActivityIndicator size="large" color={brand} />
      </View>
    );
  }

  function renderErrorView() {
    return (
      <View
        style={[
          styles.centerFlex,
          { backgroundColor: bg, paddingHorizontal: 24 },
        ]}
      >
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={muted}
        />
        <Text
          style={[styles.infoText, { color: muted }]}
        >
          {netInfo.isConnected === false
            ? 'Sin conexión a Internet. Verifica tu conexión.'
            : config.loadingErrorText}
        </Text>
        <Pressable
          onPress={() => void refetch()}
          style={[styles.retryBtn, { backgroundColor: brand }]}
        >
          <MaterialCommunityIcons name="refresh" size={18} color={iconWhite} />
          <Text style={[styles.retryBtnText, { color: iconWhite }]}>
            Reintentar
          </Text>
        </Pressable>
      </View>
    );
  }

  function renderListTab() {
    const empty = !items || items.length === 0;
    const noSearchResults = !empty && filteredItems.length === 0;

    if (empty) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name={config.emptyIcon as 'folder-open-outline' | 'ruler'}
            size={64}
            color={muted}
          />
          <Text
            style={[styles.emptyTitle, { color: muted }]}
          >
            {config.emptyText}
          </Text>
          <Text
            style={[styles.emptyDesc, { color: muted }]}
          >
            {config.emptyDescription}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.listTab}>
        {/* ── Search bar ─────────────────────────────────────────── */}
        <View style={styles.searchWrapper}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: surface, borderColor: border },
            ]}
          >
            <MaterialCommunityIcons name="magnify" size={20} color={muted} />
            <TextInput
              placeholder={`Buscar ${config.entityNamePluralLower}...`}
              placeholderTextColor={muted}
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={[styles.searchInput, { color: fg }]}
            />
            {searchTerm ? (
              <Pressable
                onPress={() => {
                  setSearchTerm('');
                  setSearchTermDebounced('');
                }}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color={muted}
                />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* ── Filter chips ──────────────────────────────────────── */}
        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setStatusFilter(filter)}
              style={[
                styles.filterChip,
                { backgroundColor: statusFilter === filter ? brand : segmentedBg },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: statusFilter === filter ? iconWhite : muted },
                ]}
              >
                {FILTER_LABELS[filter]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Filter error banner ────────────────────────────────── */}
        {excludedCount > 0 ? (
          <View
            style={[styles.errorBanner, { backgroundColor: errorBg }]}
          >
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={18}
              color={errorColor}
            />
            <Text style={[styles.errorBannerText, { color: errorColor }]}>
              {excludedCount} elemento{excludedCount !== 1 ? 's' : ''} no pudo
              {excludedCount === 1 ? '' : 'ieron'} procesarse debido a un error.
            </Text>
          </View>
        ) : null}

        {/* ── List / No results ──────────────────────────────────── */}
        {noSearchResults ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="file-search-outline"
              size={64}
              color={muted}
            />
            <Text
              style={[styles.infoText, { color: muted }]}
            >
              {searchTermDebounced.trim()
                ? `No se encontraron resultados para "${searchTermDebounced.trim()}".`
                : 'No se encontraron resultados con el filtro actual.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => String(config.getId(item))}
            contentContainerStyle={styles.listContent}
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
                    {
                      surface,
                      border,
                      fg,
                      muted,
                      brand,
                      iconWhite,
                      errorColor,
                    },
                    isDark,
                  )
            }
            ListFooterComponent={null}
          />
        )}
      </View>
    );
  }

  function renderFormTab() {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.formScroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.formTitle, { color: fg }]}>
            {editingItem
              ? `Editar ${config.entityName}`
              : `Nueva ${config.entityName}`}
          </Text>

          {formErrors.general ? (
            <View
              style={[styles.formErrorBox, { backgroundColor: errorBg }]}
            >
              <MaterialCommunityIcons
                name="alert-circle"
                size={18}
                color={errorColor}
              />
              <Text
                style={[styles.formErrorText, { color: errorColor }]}
              >
                {formErrors.general}
              </Text>
            </View>
          ) : null}

          {config.fields.map((field) => {
            const fieldErr = formErrors.fields[field.name];
            return (
              <View key={field.name} style={styles.fieldWrapper}>
                <Text
                  style={[styles.fieldLabel, { color: muted }]}
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
                    style={[styles.fieldError, { color: errorColor }]}
                  >
                    {fieldErr}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </ScrollView>

        <View
          style={[styles.formFooter, { borderTopColor: border }]}
        >
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
            style={[
              styles.primaryBtn,
              {
                backgroundColor: errorColor,
                flexDirection: 'row',
                gap: 6,
                opacity: isSaving ? 0.6 : 1,
              },
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size={16} color={iconWhite} />
            ) : null}
            <Text style={[styles.primaryBtnText, { color: iconWhite }]}>
              Guardar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={switchToList}
            disabled={isSaving}
            activeOpacity={0.8}
            style={[styles.secondaryBtn, { borderColor: border }]}
          >
            <Text style={[styles.secondaryBtnText, { color: fg }]}>
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
      <View style={[styles.flex, { backgroundColor: bg }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleRow}>
            {navigation.canGoBack() ? (
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={8}
                style={styles.backButton}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={28}
                  color={fg}
                />
              </Pressable>
            ) : null}
            <Text
              style={[styles.headerTitle, { color: fg }]}
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

        <View style={styles.segmentedRow}>
          <View
            style={[styles.segmentedContainer, { backgroundColor: segmentedBg }]}
          >
            <TouchableOpacity
              onPress={() => {
                if (!isFormActive) return;
                switchToList();
              }}
              style={[
                styles.segmentBtn,
                { backgroundColor: isFormActive ? transparent : surface },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: isFormActive ? muted : fg },
                ]}
              >
                📋 Lista
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (isFormActive) return;
                startNew();
              }}
              testID="add-new-btn"
              style={[
                styles.segmentBtn,
                { backgroundColor: isFormActive ? surface : transparent },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: isFormActive ? fg : muted },
                ]}
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
            style={[styles.modalOverlay, { backgroundColor: modalOverlay }]}
            onPress={() => setToggleTarget(null)}
          />
          <View
            style={[styles.modalSheet, { backgroundColor: surface }]}
          >
            <View style={styles.modalHeader}>
              <View
                style={[styles.modalIconWrapper, { backgroundColor: errorBg }]}
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
                style={[styles.modalTitle, { color: fg }]}
              >
                {toggleTarget?.estado
                  ? `Desactivar "${toggleTarget?.nombre}"?`
                  : `Activar "${toggleTarget?.nombre}"?`}
              </Text>
              <Text
                style={[styles.modalDesc, { color: muted }]}
              >
                {toggleTarget?.estado
                  ? 'El elemento se moverá a la papelera.'
                  : 'El elemento volverá a estar activo.'}
              </Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  if (toggleTarget) handleToggleStatus(toggleTarget);
                  setToggleTarget(null);
                }}
                activeOpacity={0.8}
                style={[styles.primaryBtn, { backgroundColor: errorColor }]}
              >
                <Text
                  style={[styles.primaryBtnText, { color: iconWhite }]}
                >
                  {toggleTarget?.estado ? 'Desactivar' : 'Activar'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setToggleTarget(null)}
                activeOpacity={0.8}
                style={[styles.secondaryBtn, { borderColor: border }]}
              >
                <Text style={[styles.secondaryBtnText, { color: fg }]}>
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
            style={[styles.modalOverlay, { backgroundColor: modalOverlay }]}
            onPress={() => setDeleteTarget(null)}
          />
          <View
            style={[styles.modalSheet, { backgroundColor: surface }]}
          >
            <View style={styles.modalHeader}>
              <View
                style={[styles.modalIconWrapper, { backgroundColor: errorBg }]}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={26}
                  color={errorColor}
                />
              </View>
              <Text
                style={[styles.modalTitle, { color: fg }]}
              >
                {deleteTarget ? config.deleteConfirmText(deleteTarget) : ''}
              </Text>
              <Text
                style={[styles.modalDesc, { color: muted }]}
              >
                Esta acción no se puede deshacer.
              </Text>
            </View>

            <View style={styles.modalActions}>
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
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: errorColor,
                    flexDirection: 'row',
                    gap: 6,
                    opacity: isSaving || deleteMutation.isPending ? 0.6 : 1,
                  },
                ]}
              >
                {isSaving || deleteMutation.isPending ? (
                  <ActivityIndicator size={16} color={iconWhite} />
                ) : null}
                <Text
                  style={[styles.primaryBtnText, { color: iconWhite }]}
                >
                  Eliminar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
                activeOpacity={0.8}
                style={[styles.secondaryBtn, { borderColor: border }]}
              >
                <Text style={[styles.secondaryBtnText, { color: fg }]}>
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

const styles = StyleSheet.create({
  // Layout
  flex: { flex: 1 },
  centerFlex: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 4,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: { marginRight: 4 },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.02 },

  // Segmented control
  segmentedRow: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  segmentedContainer: { flexDirection: 'row', borderRadius: 10, padding: 3 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.01 },

  // Search bar
  searchWrapper: { paddingHorizontal: 20, paddingBottom: 8, paddingTop: 4 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, paddingVertical: 0 },

  // Filter chips
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  filterChipText: { fontSize: 12, fontWeight: '600' },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  errorBannerText: { fontSize: 13, flex: 1 },

  // List
  listTab: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 8, gap: 10 },

  // Empty / no results
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: { marginTop: 16, textAlign: 'center', fontSize: 20, fontWeight: '700' },
  emptyDesc: { marginTop: 4, textAlign: 'center', fontSize: 14 },

  // Shared info text
  infoText: { marginTop: 16, textAlign: 'center', fontSize: 16 },

  // Coming soon
  comingSoonTitle: { marginTop: 16, textAlign: 'center', fontSize: 24, fontWeight: '700' },
  comingSoonDesc: { marginTop: 8, textAlign: 'center', fontSize: 14 },

  // Retry button
  retryBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryBtnText: { fontWeight: '600' },

  // Form
  formScroll: { padding: 20, gap: 18 },
  formTitle: { fontSize: 18, fontWeight: '700' },
  formErrorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    padding: 12,
  },
  formErrorText: { flex: 1, fontSize: 14, lineHeight: 20 },
  fieldWrapper: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.08,
    textTransform: 'uppercase',
  },
  fieldError: { fontSize: 12, marginLeft: 4 },
  formFooter: { padding: 20, gap: 10, borderTopWidth: 1 },

  // Buttons
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '600' },
  secondaryBtnText: { fontSize: 15, fontWeight: '600' },

  // Default list item
  listItem: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemInfo: { flex: 1 },
  listItemTitle: { fontSize: 16, fontWeight: '600' },
  listItemSubtitle: { fontSize: 13, marginTop: 2 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal
  modalOverlay: { flex: 1 },
  modalSheet: {
    borderRadius: 24,
    padding: 24,
    paddingBottom: 34,
    marginTop: 'auto',
  },
  modalHeader: { alignItems: 'center', marginBottom: 16 },
  modalIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  modalDesc: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  modalActions: { gap: 10 },
});

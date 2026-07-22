/* globals console, clearTimeout, setTimeout -- RN globals */
import React from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { colors, themeColors } from '@/constants/colors';
import {
  addFamilyMember,
  assignFamilyHead,
  createFamily,
  deleteFamily,
  deleteFamilyPermanent,
  fetchFamilies,
  fetchFamiliesTrash,
  restoreFamily,
  searchUsers,
} from '@/services/families';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList, Family, SearchUserResult } from '@/types';

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
  const t = themeColors(isDark);
  const brand = t.brand;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isTrash}
      style={{
        backgroundColor: t.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: t.border,
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
          backgroundColor: t.bg,
        }}
      >
        <MaterialCommunityIcons
          name={isTrash ? 'delete-restore' : 'account-group'}
          size={22}
          color={isTrash ? colors.brandOrange : t.muted}
        />
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 16, fontWeight: '600', color: t.fg }}
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
          <Text style={{ fontSize: 13, color: t.muted, marginTop: 3 }}>
            Sin jefe asignado
          </Text>
        )}
        {family.detalle_familia ? (
          <Text
            style={{ fontSize: 12, color: t.muted, marginTop: 2 }}
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
              borderColor: t.border,
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
              borderColor: t.border,
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
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={t.muted}
        />
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

function useJefeSearch(
  jefeQuery: string,
  selectedJefe: SearchUserResult | null,
) {
  const [jefeResults, setJefeResults] = React.useState<SearchUserResult[]>([]);
  const [isSearchingJefe, setIsSearchingJefe] = React.useState(false);

  React.useEffect(() => {
    const trimmed = jefeQuery.trim();
    if (trimmed.length < 3 || selectedJefe) {
      setJefeResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingJefe(true);
      try {
        const results = await searchUsers(trimmed);
        setJefeResults(results ?? []);
      } catch (err) {
        console.error(err);
        setJefeResults([]);
      } finally {
        setIsSearchingJefe(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [jefeQuery, selectedJefe]);

  return { jefeResults, setJefeResults, isSearchingJefe };
}

async function executePermanentDelete(
  family: Family,
  onDeleted: () => void,
): Promise<void> {
  try {
    await deleteFamilyPermanent(family.id_familia);
    onDeleted();
  } catch (err) {
    console.error(err);
    Alert.alert('Error', 'No se pudo eliminar permanentemente la familia.');
  }
}

// ── Screen ────────────────────────────────────────────────

export default function FamilyListScreen(): React.JSX.Element {
  const { user } = useAuth();
  const { colorScheme } = useTheme();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const isDark = colorScheme === 'dark';

  const t = themeColors(isDark);

  const [showTrash, setShowTrash] = React.useState(false);
  const [restoreTarget, setRestoreTarget] = React.useState<Family | null>(null);
  const [jefeQuery, setJefeQuery] = React.useState('');
  const [selectedJefe, setSelectedJefe] =
    React.useState<SearchUserResult | null>(null);
  const [isRestoring, setIsRestoring] = React.useState(false);

  // Form states
  const [tab, setTab] = React.useState<'list' | 'form'>('list');
  const [nombre, setNombre] = React.useState('');
  const [detalle, setDetalle] = React.useState('');
  const [formJefeQuery, setFormJefeQuery] = React.useState('');
  const [formSelectedJefe, setFormSelectedJefe] =
    React.useState<SearchUserResult | null>(null);
  const [isFormSaving, setIsFormSaving] = React.useState(false);
  const [formServerError, setFormServerError] = React.useState('');
  const [formFieldErrors, setFormFieldErrors] = React.useState<
    Record<string, string>
  >({});

  const { jefeResults, setJefeResults, isSearchingJefe } = useJefeSearch(
    jefeQuery,
    selectedJefe,
  );

  const { jefeResults: formJefeResults, isSearchingJefe: isSearchingFormJefe } =
    useJefeSearch(formJefeQuery, formSelectedJefe);

  const handleOpenRestore = (family: Family) => {
    setRestoreTarget(family);
    setJefeQuery('');
    setSelectedJefe(null);
    setJefeResults([]);
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget || !selectedJefe) return;
    setIsRestoring(true);
    try {
      await restoreFamily(restoreTarget.id_familia, selectedJefe.id_usuario);
      void refetch();
      void refetchTrash();
      setRestoreTarget(null);
    } catch (err) {
      console.error(err);
      Alert.alert(
        'Error',
        'No se pudo reactivar la familia. Verifica que el jefe seleccionado esté activo.',
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePromptPermanentDelete = (family: Family) => {
    Alert.alert(
      'Eliminar permanentemente',
      `¿Estás seguro de eliminar permanentemente la familia "${family.nombre_familia}"? Esta acción es irreversible.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void executePermanentDelete(family, () => {
              void refetchTrash();
            });
          },
        },
      ],
    );
  };

  const handleCreateSubmit = async () => {
    const jefe = formSelectedJefe;
    if (!nombre.trim() || !jefe) {
      const errors: Record<string, string> = {};
      if (!nombre.trim()) errors.nombre = 'El nombre es obligatorio.';
      if (!jefe) errors.jefe = 'Debes seleccionar un jefe de familia.';
      setFormFieldErrors(errors);
      return;
    }

    setIsFormSaving(true);
    setFormServerError('');

    try {
      const payload = {
        nombre_familia: nombre.trim(),
        ...(detalle.trim() ? { detalle_familia: detalle.trim() } : {}),
      };

      const created = await createFamily(payload);
      const newFamilyId = created.id_familia;

      try {
        await addFamilyMember(jefe.id_usuario, newFamilyId);
        await assignFamilyHead(newFamilyId, jefe.id_usuario);
      } catch {
        try {
          await deleteFamily(newFamilyId);
        } catch {
          // rollback
        }
        throw new Error('Error al asignar el jefe de familia.');
      }

      void queryClient.invalidateQueries({ queryKey: ['families'] });
      setNombre('');
      setDetalle('');
      setFormJefeQuery('');
      setFormSelectedJefe(null);
      setFormFieldErrors({});
      setTab('list');
    } catch (err) {
      console.error(err);
      setFormServerError(
        err instanceof Error ? err.message : 'Error al crear la familia.',
      );
    } finally {
      setIsFormSaving(false);
    }
  };

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
    return <UnauthorizedView bg={t.bg} muted={t.muted} />;
  }

  if (isLoading) {
    return <LoadingView bg={t.bg} brand={t.brand} />;
  }

  if (isError) {
    return (
      <ErrorView
        bg={t.bg}
        muted={t.muted}
        brand={t.brand}
        onRefetch={() => void refetch()}
      />
    );
  }

  const currentList = showTrash ? (trashFamilies ?? []) : (families ?? []);
  const isEmpty = currentList.length === 0;

  function renderSegmentedControl() {
    if (showTrash) return null;
    const isFormActive = tab === 'form';
    return (
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
            onPress={() => setTab('list')}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: isFormActive ? colors.transparent : t.surface,
              alignItems: 'center',
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: isFormActive ? t.muted : t.fg,
                letterSpacing: 0.01,
              }}
            >
              📋 Lista
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('form')}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: isFormActive ? t.surface : colors.transparent,
              alignItems: 'center',
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: isFormActive ? t.fg : t.muted,
                letterSpacing: 0.01,
              }}
            >
              ➕ Nuevo
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderListTab() {
    return isEmpty ? (
      <EmptyView muted={t.muted} />
    ) : (
      <FlatList
        data={currentList}
        keyExtractor={(item) => String(item.id_familia)}
        contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 10 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={t.brand}
          />
        }
        renderItem={({ item }) => (
          <FamilyCard
            family={item}
            isDark={isDark}
            isTrash={showTrash}
            onPress={() => {
              if (!showTrash) {
                navigation.navigate('FamilyDetail', {
                  familyId: item.id_familia,
                });
              }
            }}
            onRestore={() => handleOpenRestore(item)}
            onPermanentDelete={() => handlePromptPermanentDelete(item)}
          />
        )}
      />
    );
  }

  function renderFormTab() {
    const errorColor = colors.brandRedCoral;
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 18 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: t.fg }}>
            Nueva familia
          </Text>

          {formServerError ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 8,
                backgroundColor: isDark
                  ? colors.admCoralBgD
                  : colors.admCoralBgL,
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
                {formServerError}
              </Text>
            </View>
          ) : null}

          {/* Nombre de la familia */}
          <View style={{ gap: 6 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 0.08,
                textTransform: 'uppercase',
                color: t.muted,
              }}
            >
              Nombre de la familia *
            </Text>
            <TextInput
              value={nombre}
              onChangeText={(text) => {
                setNombre(text);
                setFormFieldErrors((prev) => ({ ...prev, nombre: '' }));
                setFormServerError('');
              }}
              placeholder="Ej. Familia López"
              placeholderTextColor={t.muted}
              style={{
                borderWidth: 1.5,
                borderColor: formFieldErrors.nombre ? errorColor : t.border,
                borderRadius: 12,
                backgroundColor: t.surface,
                color: t.fg,
                fontSize: 15,
                paddingHorizontal: 14,
                height: 46,
              }}
            />
            {formFieldErrors.nombre ? (
              <Text style={{ fontSize: 12, color: errorColor, marginLeft: 4 }}>
                {formFieldErrors.nombre}
              </Text>
            ) : null}
          </View>

          {/* Jefe de familia */}
          <View style={{ gap: 6 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 0.08,
                textTransform: 'uppercase',
                color: t.muted,
              }}
            >
              Jefe de familia *
            </Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                value={formJefeQuery}
                onChangeText={(text) => {
                  setFormJefeQuery(text);
                  if (formSelectedJefe) setFormSelectedJefe(null);
                  setFormFieldErrors((prev) => ({ ...prev, jefe: '' }));
                  setFormServerError('');
                }}
                placeholder="Buscar por nombre o correo..."
                placeholderTextColor={t.muted}
                style={{
                  borderWidth: 1.5,
                  borderColor: formFieldErrors.jefe ? errorColor : t.border,
                  borderRadius: 12,
                  backgroundColor: t.surface,
                  color: t.fg,
                  fontSize: 15,
                  paddingHorizontal: 14,
                  height: 46,
                  paddingRight: (formSelectedJefe ?? formJefeQuery) ? 40 : 14,
                }}
              />
              {(formSelectedJefe ?? formJefeQuery) ? (
                <Pressable
                  onPress={() => {
                    setFormJefeQuery('');
                    setFormSelectedJefe(null);
                  }}
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
            {formFieldErrors.jefe ? (
              <Text style={{ fontSize: 12, color: errorColor, marginLeft: 4 }}>
                {formFieldErrors.jefe}
              </Text>
            ) : null}

            {isSearchingFormJefe ? (
              <ActivityIndicator
                size="small"
                color={t.brand}
                style={{ marginTop: 8 }}
              />
            ) : null}

            {/* Suggestions */}
            {formJefeResults.length > 0 && !formSelectedJefe ? (
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
                  {formJefeResults.map((user) => (
                    <TouchableOpacity
                      key={user.id_usuario}
                      activeOpacity={0.7}
                      onPress={() => {
                        setFormSelectedJefe(user);
                        setFormJefeQuery(
                          `${user.nombre} ${user.apellido_paterno}`,
                        );
                      }}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: t.border,
                      }}
                    >
                      <Text
                        style={{ fontSize: 14, fontWeight: '600', color: t.fg }}
                        numberOfLines={1}
                      >
                        {user.nombre} {user.apellido_paterno}
                      </Text>
                      <Text
                        style={{ fontSize: 12, color: t.muted, marginTop: 1 }}
                        numberOfLines={1}
                      >
                        {user.email ?? user.correo}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>

          {/* Detalle */}
          <View style={{ gap: 6 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 0.08,
                textTransform: 'uppercase',
                color: t.muted,
              }}
            >
              Detalle
            </Text>
            <TextInput
              value={detalle}
              onChangeText={setDetalle}
              placeholder="Descripción opcional"
              placeholderTextColor={t.muted}
              multiline
              numberOfLines={3}
              style={{
                borderWidth: 1.5,
                borderColor: t.border,
                borderRadius: 12,
                backgroundColor: t.surface,
                color: t.fg,
                fontSize: 15,
                paddingHorizontal: 14,
                height: 80,
                paddingTop: 12,
                textAlignVertical: 'top',
              }}
            />
          </View>
        </ScrollView>

        <View
          style={{
            padding: 20,
            gap: 10,
            borderTopWidth: 1,
            borderTopColor: t.border,
          }}
        >
          <TouchableOpacity
            onPress={handleCreateSubmit}
            disabled={isFormSaving}
            activeOpacity={0.8}
            style={{
              height: 50,
              borderRadius: 14,
              backgroundColor: errorColor,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              opacity: isFormSaving ? 0.6 : 1,
            }}
          >
            {isFormSaving ? (
              <ActivityIndicator size={16} color={colors.iconWhite} />
            ) : null}
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: colors.iconWhite,
              }}
            >
              Guardar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setNombre('');
              setDetalle('');
              setFormJefeQuery('');
              setFormSelectedJefe(null);
              setFormFieldErrors({});
              setFormServerError('');
              setTab('list');
            }}
            disabled={isFormSaving}
            activeOpacity={0.8}
            style={{
              height: 44,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: t.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: t.fg }}>
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
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
              color: t.fg,
            }}
          >
            {showTrash ? 'Papelera' : 'Familias'}
          </Text>
          <Text style={{ fontSize: 14, color: t.muted, marginTop: 2 }}>
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
              borderColor: t.border,
              backgroundColor: t.surface,
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
              color={showTrash ? colors.brandRedCoral : t.muted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {renderSegmentedControl()}

      {showTrash || tab === 'list' ? renderListTab() : renderFormTab()}

      {/* Modal de Restauración (Requisito Jefe de Familia) */}
      <RestoreFamilyModal
        restoreTarget={restoreTarget}
        isDark={isDark}
        jefeQuery={jefeQuery}
        selectedJefe={selectedJefe}
        isSearchingJefe={isSearchingJefe}
        isRestoring={isRestoring}
        jefeResults={jefeResults}
        onClose={() => setRestoreTarget(null)}
        onQueryChange={(text) => {
          setJefeQuery(text);
          if (selectedJefe) setSelectedJefe(null);
        }}
        onSelectJefe={(jefe) => setSelectedJefe(jefe)}
        onConfirm={() => void handleConfirmRestore()}
      />
    </View>
  );
}

interface RestoreFamilyModalProps {
  readonly restoreTarget: Family | null;
  readonly isDark: boolean;
  readonly jefeQuery: string;
  readonly selectedJefe: SearchUserResult | null;
  readonly isSearchingJefe: boolean;
  readonly isRestoring: boolean;
  readonly jefeResults: SearchUserResult[];
  readonly onClose: () => void;
  readonly onQueryChange: (text: string) => void;
  readonly onSelectJefe: (jefe: SearchUserResult | null) => void;
  readonly onConfirm: () => void;
}

function RestoreFamilyModal({
  restoreTarget,
  isDark,
  jefeQuery,
  selectedJefe,
  isSearchingJefe,
  isRestoring,
  jefeResults,
  onClose,
  onQueryChange,
  onSelectJefe,
  onConfirm,
}: RestoreFamilyModalProps): React.JSX.Element | null {
  const t = themeColors(isDark);
  if (!restoreTarget) return null;

  return (
    <Modal
      visible={restoreTarget !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.modalOverlayBg,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: t.surface,
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            borderWidth: 1,
            borderColor: t.border,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: t.fg }}>
            Reactivar Familia
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: t.muted,
              marginTop: 4,
              marginBottom: 16,
            }}
          >
            Para reactivar "{restoreTarget.nombre_familia}" es obligatorio
            asignar un jefe de familia.
          </Text>

          {/* Buscador de Jefe */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: t.muted,
              marginBottom: 6,
              textTransform: 'uppercase',
            }}
          >
            Buscar Jefe de Familia *
          </Text>
          <TextInput
            placeholder="Nombre o correo del usuario..."
            placeholderTextColor={t.muted}
            value={jefeQuery}
            onChangeText={onQueryChange}
            style={{
              height: 42,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              color: t.fg,
              backgroundColor: t.input,
              fontSize: 14,
            }}
          />

          {/* Usuario seleccionado */}
          {selectedJefe ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 10,
                padding: 10,
                borderRadius: 10,
                backgroundColor: t.accentBg,
                borderWidth: 1,
                borderColor: t.brand,
              }}
            >
              <View>
                <Text
                  style={{ fontSize: 14, fontWeight: '600', color: t.brand }}
                >
                  {selectedJefe.nombre} {selectedJefe.apellido_paterno}
                </Text>
                <Text style={{ fontSize: 12, color: t.muted }}>
                  {selectedJefe.email ?? selectedJefe.correo}
                </Text>
              </View>
              <TouchableOpacity onPress={() => onSelectJefe(null)}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={20}
                  color={colors.brandRedCoral}
                />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Resultados de búsqueda */}
          {isSearchingJefe ? (
            <ActivityIndicator
              size="small"
              color={t.brand}
              style={{ marginTop: 12 }}
            />
          ) : jefeResults.length > 0 && !selectedJefe ? (
            <View
              style={{
                maxHeight: 150,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 10,
                marginTop: 8,
                overflow: 'hidden',
              }}
            >
              <FlatList
                data={jefeResults}
                keyExtractor={(item) => String(item.id_usuario)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{
                      padding: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: t.border,
                    }}
                    onPress={() => onSelectJefe(item)}
                  >
                    <Text
                      style={{ fontSize: 13, fontWeight: '600', color: t.fg }}
                    >
                      {item.nombre} {item.apellido_paterno}
                    </Text>
                    <Text style={{ fontSize: 11, color: t.muted }}>
                      {item.email ?? item.correo}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          ) : null}

          {/* Botones de Acción */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 20,
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                paddingHorizontal: 16,
                height: 38,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: t.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: t.fg }}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={!selectedJefe || isRestoring}
              onPress={onConfirm}
              style={{
                paddingHorizontal: 18,
                height: 38,
                borderRadius: 10,
                backgroundColor: t.brand,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: selectedJefe && !isRestoring ? 1 : 0.5,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: colors.iconWhite,
                }}
              >
                {isRestoring ? 'Reactivando...' : 'Reactivar Familia'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

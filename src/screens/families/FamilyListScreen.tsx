import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import { colors, themeColors } from '@/constants/colors';
import {
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
        <MaterialCommunityIcons name="chevron-right" size={22} color={t.muted} />
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

// ── Screen ────────────────────────────────────────────────

export default function FamilyListScreen(): React.JSX.Element {
  const { user } = useAuth();
  const { colorScheme } = useTheme();
  const navigation = useNavigation<Nav>();
  const isDark = colorScheme === 'dark';

  const t = themeColors(isDark);

  const [showTrash, setShowTrash] = React.useState(false);
  const [restoreTarget, setRestoreTarget] = React.useState<Family | null>(null);
  const [jefeQuery, setJefeQuery] = React.useState('');
  const [jefeResults, setJefeResults] = React.useState<SearchUserResult[]>([]);
  const [selectedJefe, setSelectedJefe] =
    React.useState<SearchUserResult | null>(null);
  const [isSearchingJefe, setIsSearchingJefe] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);

  React.useEffect(() => {
    const trimmed = jefeQuery.trim();
    if (trimmed.length < 1 || selectedJefe) {
      setJefeResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingJefe(true);
      try {
        const results = await searchUsers(trimmed, true);
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
          onPress: async () => {
            try {
              await deleteFamilyPermanent(family.id_familia);
              void refetchTrash();
            } catch (err) {
              console.error(err);
              Alert.alert(
                'Error',
                'No se pudo eliminar permanentemente la familia.',
              );
            }
          },
        },
      ],
    );
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

          <TouchableOpacity
            activeOpacity={0.8}
            style={{
              borderRadius: 10,
              backgroundColor: colors.brandRedCoral,
              paddingHorizontal: 16,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => navigation.navigate('FamilyForm')}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.iconWhite,
              }}
            >
              Agregar
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isEmpty ? (
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
      )}

      {/* Modal de Restauración (Requisito Jefe de Familia) */}
      <Modal
        visible={restoreTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRestoreTarget(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
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
              Para reactivar "{restoreTarget?.nombre_familia}" es obligatorio
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
              onChangeText={(text) => {
                setJefeQuery(text);
                if (selectedJefe) setSelectedJefe(null);
              }}
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
                <TouchableOpacity onPress={() => setSelectedJefe(null)}>
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
                      onPress={() => setSelectedJefe(item)}
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
                onPress={() => setRestoreTarget(null)}
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
                onPress={() => void handleConfirmRestore()}
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
    </View>
  );
}

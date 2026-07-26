import React, { useMemo } from 'react';
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
import { useUserSearch } from '@/hooks/useUserSearch';
import {
  deleteFamilyPermanent,
  fetchFamilies,
  fetchFamiliesTrash,
  restoreFamily,
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
        ) : (family.jefe_nombre ? (
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
        ))}
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
  const isDark = colorScheme === 'dark';

  const t = useMemo(() => themeColors(isDark), [isDark]);
  const coral = colors.brandRedCoral;

  const [permDeleteTarget, setPermDeleteTarget] = React.useState<Family | null>(
    null,
  );
  const [showTrash, setShowTrash] = React.useState(false);
  const [restoreTarget, setRestoreTarget] = React.useState<Family | null>(null);
  const [jefeQuery, setJefeQuery] = React.useState('');
  const [selectedJefe, setSelectedJefe] =
    React.useState<SearchUserResult | null>(null);
  const [isRestoring, setIsRestoring] = React.useState(false);

  const {
    results: jefeResults,
    setResults: setJefeResults,
    isSearching: isSearchingJefe,
  } = useUserSearch(jefeQuery, selectedJefe);

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
    setPermDeleteTarget(family);
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
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.bg,
          paddingHorizontal: 24,
        }}
      >
        <MaterialCommunityIcons name="lock-outline" size={48} color={t.muted} />
        <Text
          style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 16,
            color: t.muted,
          }}
        >
          No tienes permisos para acceder a esta sección.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.bg,
        }}
      >
        <ActivityIndicator size="large" color={t.brand} />
      </View>
    );
  }

  if (isError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.bg,
          paddingHorizontal: 24,
        }}
      >
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={t.muted}
        />
        <Text
          style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 16,
            color: t.muted,
          }}
        >
          Error al cargar las familias.
        </Text>
        <Pressable
          onPress={() => void refetch()}
          style={{
            marginTop: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: t.brand,
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

  const currentList = showTrash ? (trashFamilies ?? []) : (families ?? []);
  const isEmpty = currentList.length === 0;

  function renderSegmentedControl() {
    if (showTrash) return null;
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
              📋 Lista
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('FamilyForm')}
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
              ➕ Nuevo
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderListTab() {
    return isEmpty ? (
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
          color={t.muted}
        />
        <Text
          style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 20,
            fontWeight: '700',
            color: t.muted,
          }}
        >
          No hay familias
        </Text>
        <Text
          style={{
            marginTop: 4,
            textAlign: 'center',
            fontSize: 14,
            color: t.muted,
          }}
        >
          Crea una familia para comenzar.
        </Text>
      </View>
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
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {showTrash ? (
              <Pressable
                onPress={() => {
                  setShowTrash(false);
                  void refetchTrash();
                }}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={28}
                  color={t.fg}
                />
              </Pressable>
            ) : null}
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
          </View>
          <Text
            style={{
              fontSize: 14,
              color: t.muted,
              marginTop: 2,
              marginLeft: showTrash ? 36 : 0,
            }}
          >
            {currentList.length}{' '}
            {showTrash
              ? (currentList.length === 1
                ? 'familia inactiva'
                : 'familias inactivas')
              : (currentList.length === 1
                ? 'familia registrada'
                : 'familias registradas')}
          </Text>
        </View>

        {!showTrash ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
                name="trash-can-outline"
                size={20}
                color={t.muted}
              />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {renderSegmentedControl()}

      {renderListTab()}

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

      {/* ── Permanent delete confirmation ──────────────────── */}
      <Modal
        visible={permDeleteTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPermDeleteTarget(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: colors.overlayBg }}
          onPress={() => setPermDeleteTarget(null)}
        />
        <View
          style={{
            backgroundColor: t.surface,
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
                backgroundColor: t.errorBg,
                marginBottom: 12,
              }}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={26}
                color={coral}
              />
            </View>
            <Text
              style={{
                fontSize: 17,
                fontWeight: '700',
                color: t.fg,
                textAlign: 'center',
              }}
            >
              ¿Eliminar permanentemente?
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: t.muted,
                marginTop: 6,
                textAlign: 'center',
              }}
            >
              Esta acción eliminará de forma irreversible la familia "
              {permDeleteTarget?.nombre_familia}".
            </Text>
          </View>
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              onPress={() => {
                if (!permDeleteTarget) return;
                void executePermanentDelete(permDeleteTarget, () => {
                  void refetchTrash();
                  setPermDeleteTarget(null);
                });
              }}
              activeOpacity={0.8}
              style={{
                height: 50,
                borderRadius: 14,
                backgroundColor: coral,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.iconWhite,
                }}
              >
                Eliminar definitivamente
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPermDeleteTarget(null)}
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
        </View>
      </Modal>
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
          ) : (jefeResults.length > 0 && !selectedJefe ? (
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
          ) : null)}

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

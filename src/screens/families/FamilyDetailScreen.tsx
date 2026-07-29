// globals console is unnecessary — console is a built-in global
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Toast from '@/components/Toast';
import { colors, themeColors } from '@/constants/colors';
import { useUserSearch } from '@/hooks/useUserSearch';
import {
  addFamilyMember,
  assignFamilyHead,
  deleteFamily,
  fetchFamily,
  fetchFamilyMembers,
  removeFamilyMember,
} from '@/services/families';
import { useTheme } from '@/store/ThemeContext';
import type {
  AdminStackParamList,
  Family,
  FamilyMember,
  SearchUserResult,
} from '@/types';
import { extractApiError } from '@/utils/apiErrors';

type Route = RouteProp<AdminStackParamList, 'FamilyDetail'>;
type Nav = NativeStackNavigationProp<AdminStackParamList, 'FamilyDetail'>;

// ── Member row ────────────────────────────────────────

interface MemberItemProps {
  readonly member: FamilyMember;
  readonly isHead: boolean;
  readonly isDark: boolean;
  readonly onAssignHead: (member: FamilyMember) => void;
  readonly onRemove: (member: FamilyMember) => void;
}

function MemberItem({
  member,
  isHead,
  isDark,
  onAssignHead,
  onRemove,
}: MemberItemProps): React.JSX.Element {
  const t = themeColors(isDark);
  const coral = colors.brandRedCoral;
  const highlightColor = colors.brandOrange;

  return (
    <View
      style={{
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.surface,
        padding: 16,
      }}
    >
      {/* Icono circular */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.bg,
        }}
      >
        <MaterialCommunityIcons
          name={isHead ? 'account-star' : 'account'}
          size={20}
          color={isHead ? highlightColor : t.muted}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 15, fontWeight: '600', color: t.fg }}
          numberOfLines={1}
        >
          {member.usuario_nombre}
        </Text>
        <Text
          style={{ fontSize: 12, color: t.muted, marginTop: 2 }}
          numberOfLines={1}
        >
          {member.usuario_correo}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 6 }}>
        {!isHead ? (
          <Pressable
            onPress={() => onAssignHead(member)}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: t.border,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? t.bg : 'transparent',
            })}
            hitSlop={6}
          >
            <MaterialCommunityIcons
              name="account-star"
              size={16}
              color={highlightColor}
            />
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => onRemove(member)}
          style={({ pressed }) => ({
            width: 32,
            height: 32,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: t.border,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? t.bg : 'transparent',
          })}
          hitSlop={6}
        >
          <MaterialCommunityIcons
            name="account-remove"
            size={16}
            color={coral}
          />
        </Pressable>
      </View>
    </View>
  );
}

// ── Add member modal ─────────────────────────────────

interface AddMemberModalProps {
  readonly visible: boolean;
  readonly isDark: boolean;
  readonly isPending: boolean;
  readonly errorMsg: string | null;
  readonly onConfirm: (userId: number) => void;
  readonly onCancel: () => void;
}

interface UserSuggestionsListProps {
  readonly results: SearchUserResult[];
  readonly isDark: boolean;
  readonly onSelect: (user: SearchUserResult) => void;
}

function UserSuggestionsList({
  results,
  isDark,
  onSelect,
}: UserSuggestionsListProps): React.JSX.Element | null {
  if (results.length === 0) return null;

  const t = themeColors(isDark);
  const iconColor = t.brand;

  return (
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
        {results.map((user, index) => (
          <View key={user.id_usuario}>
            {index > 0 ? (
              <View style={{ height: 1, backgroundColor: t.border }} />
            ) : null}
            <Pressable
              onPress={() => onSelect(user)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? t.bg : 'transparent',
              })}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: t.accentBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <MaterialCommunityIcons
                    name="account"
                    size={16}
                    color={iconColor}
                  />
                </View>
                <View style={{ flex: 1 }}>
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
                    {user.email}
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function AddMemberModal({
  visible,
  isDark,
  isPending,
  errorMsg,
  onConfirm,
  onCancel,
}: AddMemberModalProps): React.JSX.Element | null {
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<SearchUserResult | null>(
    null,
  );
  const {
    results,
    setResults,
    isSearching: loading,
  } = useUserSearch(query, selectedUser, 400);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setSelectedUser(null);
      return;
    }
  }, [visible, setResults]);

  const handleClear = (): void => {
    setQuery('');
    setSelectedUser(null);
    setResults([]);
  };

  const handleSelect = (user: SearchUserResult): void => {
    setSelectedUser(user);
    setQuery(`${user.nombre} ${user.apellido_paterno} (${user.email})`);
    setResults([]);
  };

  const handleChangeText = (text: string): void => {
    setQuery(text);
    if (selectedUser) {
      setSelectedUser(null);
    }
  };

  const t = themeColors(isDark);
  const primaryColor = colors.brandRedCoral;
  const disabledBg = t.border;
  const errorColor = colors.brandRedCoral;

  const handleConfirm = (): void => {
    if (selectedUser) {
      onConfirm(selectedUser.id_usuario);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: colors.overlayBg }}
          onPress={onCancel}
        />
        <View
          style={{
            backgroundColor: t.surface,
            borderRadius: 24,
            padding: 24,
            paddingBottom: 34,
            marginTop: 'auto',
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: t.border,
          }}
        >
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.coralBg,
                marginBottom: 12,
              }}
            >
              <MaterialCommunityIcons
                name="account-plus"
                size={26}
                color={primaryColor}
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
              Agregar miembro
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: t.muted,
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              Busca un usuario por su nombre o correo.
            </Text>
          </View>

          {/* Search input */}
          <View style={{ position: 'relative' }}>
            <TextInput
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: t.border,
                backgroundColor: t.input,
                paddingLeft: 16,
                paddingRight: (selectedUser ?? query) ? 40 : 16,
                paddingVertical: 12,
                fontSize: 16,
                color: t.fg,
              }}
              placeholder="Nombre o correo..."
              placeholderTextColor={t.muted}
              value={query}
              onChangeText={handleChangeText}
              editable={!isPending}
            />
            {(selectedUser ?? query) ? (
              <Pressable
                onPress={handleClear}
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

          {/* Suggestions */}
          <UserSuggestionsList
            results={results}
            isDark={isDark}
            onSelect={handleSelect}
          />

          {loading ? (
            <ActivityIndicator
              size="small"
              color={primaryColor}
              style={{ marginTop: 8 }}
            />
          ) : null}

          {/* Error */}
          {errorMsg ? (
            <View
              style={{
                marginTop: 10,
                borderRadius: 10,
                backgroundColor: t.errorBg,
                paddingHorizontal: 12,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={16}
                color={errorColor}
              />
              <Text style={{ fontSize: 13, color: errorColor, flex: 1 }}>
                {errorMsg}
              </Text>
            </View>
          ) : null}

          {/* Actions */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 20,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onCancel}
              disabled={isPending}
              style={{
                width: '47%',
                height: 40,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: t.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: t.fg }}>
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleConfirm}
              disabled={!selectedUser || isPending}
              style={{
                width: '47%',
                height: 40,
                borderRadius: 10,
                backgroundColor: selectedUser ? primaryColor : disabledBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isPending ? (
                <ActivityIndicator
                  size={16}
                  color={selectedUser ? colors.iconWhite : t.fg}
                />
              ) : null}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: selectedUser ? colors.iconWhite : t.muted,
                }}
              >
                Agregar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Confirm action modal ─────────────────────────────

interface ConfirmActionModalProps {
  readonly visible: boolean;
  readonly isDark: boolean;
  readonly iconName: React.ComponentProps<
    typeof MaterialCommunityIcons
  >['name'];
  readonly iconBgColor: string;
  readonly iconColor: string;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly confirmBgColor: string;
  readonly isPending: boolean;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}

function ConfirmActionModal({
  visible,
  isDark,
  iconName,
  iconBgColor,
  iconColor,
  title,
  description,
  confirmLabel,
  confirmBgColor,
  isPending,
  onConfirm,
  onClose,
}: ConfirmActionModalProps): React.JSX.Element | null {
  const t = themeColors(isDark);
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: colors.overlayBg }}
        onPress={onClose}
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
              backgroundColor: iconBgColor,
              marginBottom: 12,
            }}
          >
            <MaterialCommunityIcons
              name={iconName}
              size={26}
              color={iconColor}
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
            {title}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: t.muted,
              marginTop: 6,
              textAlign: 'center',
            }}
          >
            {description}
          </Text>
        </View>
        <View style={{ gap: 10 }}>
          <TouchableOpacity
            onPress={onConfirm}
            disabled={isPending}
            activeOpacity={0.8}
            style={{
              height: 50,
              borderRadius: 14,
              backgroundColor: confirmBgColor,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? (
              <ActivityIndicator size={16} color={colors.iconWhite} />
            ) : null}
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: colors.iconWhite,
              }}
            >
              {confirmLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            disabled={isPending}
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
  );
}

// ── Main screen ──────────────────────────────────────

export default function FamilyDetailScreen(): React.JSX.Element {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { familyId } = route.params;
  const { colorScheme } = useTheme();
  const queryClient = useQueryClient();
  const isDark = colorScheme === 'dark';

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [removeMemberTarget, setRemoveMemberTarget] =
    useState<FamilyMember | null>(null);
  const [assignHeadTarget, setAssignHeadTarget] = useState<FamilyMember | null>(
    null,
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const {
    data: family,
    isLoading: familyLoading,
    refetch: refetchFamily,
  } = useQuery<Family>({
    queryKey: ['family', familyId],
    queryFn: () => fetchFamily(familyId),
    staleTime: 30_000,
  });

  const {
    data: members,
    isLoading: membersLoading,
    refetch: refetchMembers,
    isRefetching,
  } = useQuery<FamilyMember[]>({
    queryKey: ['familyMembers', familyId],
    queryFn: () => fetchFamilyMembers(familyId),
    staleTime: 30_000,
  });

  const showToast = (
    message: string,
    type: 'success' | 'error' = 'success',
  ): void => {
    setToastMessage(message);
    setToastType(type);
  };

  const addMemberMutation = useMutation({
    mutationFn: (userId: number) => addFamilyMember(userId, familyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['familyMembers', familyId],
      });
      setAddModalVisible(false);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: number) => removeFamilyMember(memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['familyMembers', familyId],
      });
      void queryClient.invalidateQueries({ queryKey: ['family', familyId] });
      setRemoveMemberTarget(null);
    },
  });

  const assignHeadMutation = useMutation({
    mutationFn: (userId: number) => assignFamilyHead(familyId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['family', familyId] });
      setAssignHeadTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteFamily(familyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['families'] });
      navigation.goBack();
    },
    onError: (err) => {
      console.error('Error al eliminar familia:', err);
      showToast('Error al eliminar la familia.', 'error');
    },
  });

  const t = useMemo(() => themeColors(isDark), [isDark]);

  if (familyLoading || membersLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">
        <ActivityIndicator size="large" color={colors.brandRedCoral} />
      </View>
    );
  }

  if (!family) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6 dark:bg-gray-950">
        <Text className="text-base text-gray-500 dark:text-gray-400">
          Familia no encontrada.
        </Text>
      </View>
    );
  }

  const handleDelete = (): void => {
    setDeleteConfirmVisible(true);
  };

  const handleRemoveMember = (member: FamilyMember): void => {
    if (family.fk_jefe_familia === member.fk_usuario) {
      showToast(
        'No puedes remover al jefe de familia. Primero asigna otro jefe.',
        'error',
      );
      return;
    }
    setRemoveMemberTarget(member);
  };

  const handleAssignHead = (member: FamilyMember): void => {
    setAssignHeadTarget(member);
  };

  const handleAddMember = (userId: number): void => {
    void addMemberMutation.mutateAsync(userId);
  };

  const coral = colors.brandRedCoral;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 60,
          paddingBottom: 4,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={{ marginRight: 4 }}
          accessibilityLabel="Regresar a la lista de familias"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="arrow-left" size={28} color={t.fg} />
        </Pressable>

        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: -0.02,
            color: t.fg,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {family.nombre_familia}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetchFamily();
              void refetchMembers();
            }}
            tintColor={t.brand}
          />
        }
      >
        {/* ── Family info card ──────────────────────────── */}
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.surface,
            padding: 20,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{ flex: 1, fontSize: 20, fontWeight: '700', color: t.fg }}
            >
              {family.nombre_familia}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                style={{ borderRadius: 8, backgroundColor: t.bg, padding: 8 }}
                onPress={() => {
                  navigation.navigate('FamilyForm', {
                    familyId,
                  });
                }}
              >
                <MaterialCommunityIcons name="pencil" size={18} color={t.fg} />
              </Pressable>
              <Pressable
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: t.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                hitSlop={6}
                onPress={handleDelete}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={18}
                  color={coral}
                />
              </Pressable>
            </View>
          </View>

          {family.jefe_nombre ? (
            <View
              style={{
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <MaterialCommunityIcons
                name="account-star"
                size={16}
                color={colors.brandOrange}
              />
              <Text style={{ marginLeft: 6, fontSize: 14, color: t.fg }}>
                Jefe: {family.jefe_nombre}
              </Text>
            </View>
          ) : null}

          {family.detalle_familia ? (
            <Text style={{ marginTop: 8, fontSize: 14, color: t.muted }}>
              {family.detalle_familia}
            </Text>
          ) : null}
        </View>

        {/* ── Members section ───────────────────────────── */}
        <View
          style={{
            marginTop: 24,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: t.fg }}>
            Miembros
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            style={{
              borderRadius: 8,
              backgroundColor: colors.brandRedCoral,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
            onPress={() => setAddModalVisible(true)}
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

        {(members ?? []).length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <MaterialCommunityIcons
              name="account-group-outline"
              size={48}
              color={t.muted}
            />
            <Text style={{ marginTop: 12, fontSize: 14, color: t.muted }}>
              No hay miembros en esta familia.
            </Text>
          </View>
        ) : (
          (members ?? []).map((member) => (
            <MemberItem
              key={member.id_familia_usuario}
              member={member}
              isHead={family.fk_jefe_familia === member.fk_usuario}
              isDark={isDark}
              onAssignHead={handleAssignHead}
              onRemove={handleRemoveMember}
            />
          ))
        )}
      </ScrollView>

      {addModalVisible ? (
        <AddMemberModal
          visible={addModalVisible}
          isDark={isDark}
          isPending={addMemberMutation.isPending}
          errorMsg={
            addMemberMutation.error
              ? extractApiError(addMemberMutation.error, [
                  'fk_usuario',
                  'fk_familia',
                  'detail',
                ])
              : null
          }
          onConfirm={handleAddMember}
          onCancel={() => {
            setAddModalVisible(false);
            addMemberMutation.reset();
          }}
        />
      ) : null}

      {/* ── Delete family confirmation ─────────────────────── */}
      {/* ── Delete family confirmation ──────────────────────── */}
      <ConfirmActionModal
        visible={deleteConfirmVisible}
        isDark={isDark}
        iconName="trash-can-outline"
        iconBgColor={t.errorBg}
        iconColor={coral}
        title={`¿Eliminar familia "${family.nombre_familia}"?`}
        description="Esta acción desactivará la familia y todos sus miembros."
        confirmLabel="Eliminar"
        confirmBgColor={coral}
        isPending={deleteMutation.isPending}
        onConfirm={() => void deleteMutation.mutateAsync()}
        onClose={() => setDeleteConfirmVisible(false)}
      />

      {/* ── Remove member confirmation ──────────────────────── */}
      <ConfirmActionModal
        visible={removeMemberTarget !== null}
        isDark={isDark}
        iconName="account-remove-outline"
        iconBgColor={t.errorBg}
        iconColor={coral}
        title={`¿Remover a "${removeMemberTarget?.usuario_nombre ?? ''}"?`}
        description="Se removerá al miembro de esta familia."
        confirmLabel="Remover"
        confirmBgColor={coral}
        isPending={removeMemberMutation.isPending}
        onConfirm={() => {
          if (!removeMemberTarget) return;
          void removeMemberMutation.mutateAsync(
            removeMemberTarget.id_familia_usuario,
          );
        }}
        onClose={() => setRemoveMemberTarget(null)}
      />

      {/* ── Assign head confirmation ────────────────────────── */}
      <ConfirmActionModal
        visible={assignHeadTarget !== null}
        isDark={isDark}
        iconName="account-star-outline"
        iconBgColor={t.accentBg}
        iconColor={colors.brandOrange}
        title="¿Designar jefe de familia?"
        description={`Se designará a "${assignHeadTarget?.usuario_nombre ?? ''}" como jefe de familia.`}
        confirmLabel="Asignar"
        confirmBgColor={colors.brandOrange}
        isPending={assignHeadMutation.isPending}
        onConfirm={() => {
          if (!assignHeadTarget) return;
          void assignHeadMutation.mutateAsync(assignHeadTarget.fk_usuario);
        }}
        onClose={() => setAssignHeadTarget(null)}
      />

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

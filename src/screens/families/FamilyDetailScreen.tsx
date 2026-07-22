/* global setTimeout, clearTimeout -- RN timer functions not in ESLint env */
import React, { useEffect, useState } from 'react';
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
import { colors } from '@/constants/colors';
import {
  addFamilyMember,
  assignFamilyHead,
  deleteFamily,
  fetchFamily,
  fetchFamilyMembers,
  removeFamilyMember,
  searchUsers,
} from '@/services/families';
import { useTheme } from '@/store/ThemeContext';
import type {
  AdminStackParamList,
  Family,
  FamilyMember,
  SearchUserResult,
} from '@/types';
import { extractApiError } from '@/utils/apiError';

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
  const surface = isDark ? colors.rassa.surfaceDark : colors.rassa.surface;
  const fg = isDark ? colors.rassa.fgDark : colors.rassa.fg;
  const muted = isDark ? colors.rassa.mutedDark : colors.rassa.muted;
  const border = isDark ? colors.rassa.borderDark : colors.rassa.border;
  const coral = colors.brandRedCoral;
  const highlightColor = colors.brandOrange;
  const accentBg = isDark ? colors.rassa.accentBgDark : colors.rassa.accentBg;

  return (
    <View
      style={{
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: surface,
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
          backgroundColor: accentBg,
        }}
      >
        <MaterialCommunityIcons
          name={isHead ? 'account-star' : 'account'}
          size={20}
          color={isHead ? highlightColor : muted}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 15, fontWeight: '600', color: fg }}
          numberOfLines={1}
        >
          {member.usuario_nombre}
        </Text>
        <Text
          style={{ fontSize: 12, color: muted, marginTop: 2 }}
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
              borderColor: border,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed
                ? isDark
                  ? '#353D35'
                  : '#F5F7F0'
                : 'transparent',
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
            borderColor: border,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed
              ? isDark
                ? '#353D35'
                : '#F5F7F0'
              : 'transparent',
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

  const border = isDark ? colors.rassa.borderDark : colors.rassa.border;
  const surface = isDark ? colors.rassa.surfaceDark : colors.rassa.surface;
  const fg = isDark ? colors.rassa.fgDark : colors.rassa.fg;
  const muted = isDark ? colors.rassa.mutedDark : colors.rassa.muted;
  const pressedBg = isDark ? colors.rassa.accentBgDark : colors.rassa.accentBg;

  const iconBg = isDark ? 'rgba(74,138,99,0.15)' : 'rgba(36,86,60,0.08)';
  const iconColor = isDark ? colors.brandPrimaryDark : colors.brandPrimary;

  return (
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
        {results.map((user, index) => (
          <View key={user.id_usuario}>
            {index > 0 ? (
              <View style={{ height: 1, backgroundColor: border }} />
            ) : null}
            <Pressable
              onPress={() => onSelect(user)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? pressedBg : 'transparent',
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
                    backgroundColor: iconBg,
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
                    style={{ fontSize: 14, fontWeight: '600', color: fg }}
                    numberOfLines={1}
                  >
                    {user.nombre} {user.apellido_paterno}
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: muted, marginTop: 1 }}
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

interface AddMemberModalContentProps extends AddMemberModalProps {
  readonly query: string;
  readonly results: SearchUserResult[];
  readonly selectedUser: SearchUserResult | null;
  readonly loading: boolean;
  readonly onChangeText: (text: string) => void;
  readonly onClear: () => void;
  readonly onSelect: (user: SearchUserResult) => void;
}

interface ModalActionsProps {
  readonly selectedUser: SearchUserResult | null;
  readonly isPending: boolean;
  readonly primaryColor: string;
  readonly disabledBg: string;
  readonly border: string;
  readonly fg: string;
  readonly muted: string;
  readonly onConfirm: (userId: number) => void;
  readonly onCancel: () => void;
}

function ModalActions({
  selectedUser,
  isPending,
  primaryColor,
  disabledBg,
  border,
  fg,
  muted,
  onConfirm,
  onCancel,
}: ModalActionsProps): React.JSX.Element {
  const handleConfirm = (): void => {
    if (selectedUser) {
      onConfirm(selectedUser.id_usuario);
    }
  };

  return (
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
          borderColor: border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: fg }}>
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
            color={selectedUser ? colors.iconWhite : fg}
          />
        ) : null}
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: selectedUser ? colors.iconWhite : muted,
          }}
        >
          Agregar
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function AddMemberModalContent({
  visible,
  isDark,
  isPending,
  errorMsg,
  query,
  results,
  selectedUser,
  loading,
  onChangeText,
  onClear,
  onSelect,
  onConfirm,
  onCancel,
}: AddMemberModalContentProps): React.JSX.Element | null {
  const modalOverlay = colors.rassa.overlay;
  const surface = isDark ? colors.rassa.surfaceDark : colors.rassa.surface;
  const border = isDark ? colors.rassa.borderDark : colors.rassa.border;
  const fg = isDark ? colors.rassa.fgDark : colors.rassa.fg;
  const muted = isDark ? colors.rassa.mutedDark : colors.rassa.muted;
  const inputBg = isDark ? colors.rassa.inputDark : colors.rassa.input;
  const primaryBg = isDark ? 'rgba(222,57,58,0.12)' : 'rgba(222,57,58,0.06)';
  const primaryColor = colors.brandRedCoral;
  const disabledBg = isDark ? colors.rassa.borderDark : colors.rassa.border;
  const errorColor = colors.brandRedCoral;
  const errorBg = isDark ? colors.rassa.errorBgDark : colors.rassa.errorBg;

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
          style={{ flex: 1, backgroundColor: modalOverlay }}
          onPress={onCancel}
        />
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 24,
            padding: 24,
            paddingBottom: 34,
            marginTop: 'auto',
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: border,
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
                backgroundColor: primaryBg,
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
                color: fg,
                textAlign: 'center',
              }}
            >
              Agregar miembro
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: muted,
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
                borderColor: border,
                backgroundColor: inputBg,
                paddingLeft: 16,
                paddingRight: (selectedUser ?? query) ? 40 : 16,
                paddingVertical: 12,
                fontSize: 16,
                color: fg,
              }}
              placeholder="Nombre o correo..."
              placeholderTextColor={muted}
              value={query}
              onChangeText={onChangeText}
              editable={!isPending}
            />
            {(selectedUser ?? query) ? (
              <Pressable
                onPress={onClear}
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

          {/* Suggestions */}
          <UserSuggestionsList
            results={results}
            isDark={isDark}
            onSelect={onSelect}
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
                backgroundColor: errorBg,
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
          <ModalActions
            selectedUser={selectedUser}
            isPending={isPending}
            primaryColor={primaryColor}
            disabledBg={disabledBg}
            border={border}
            fg={fg}
            muted={muted}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  const [results, setResults] = useState<SearchUserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUserResult | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setSelectedUser(null);
      return;
    }
  }, [visible]);

  useEffect(() => {
    const trimmed = query.trim();
    const shouldSearch = trimmed.length >= 2 && !selectedUser;
    if (!shouldSearch) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchUsers(trimmed);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query, selectedUser]);

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

  return (
    <AddMemberModalContent
      visible={visible}
      isDark={isDark}
      isPending={isPending}
      errorMsg={errorMsg}
      query={query}
      results={results}
      selectedUser={selectedUser}
      loading={loading}
      onChangeText={handleChangeText}
      onClear={handleClear}
      onSelect={handleSelect}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

interface ConfirmModalProps {
  readonly visible: boolean;
  readonly title: string;
  readonly description: string;
  readonly confirmText: string;
  readonly cancelText: string;
  readonly isDestructive: boolean;
  readonly iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  readonly isDark: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

function ConfirmModal({
  visible,
  title,
  description,
  confirmText,
  cancelText,
  isDestructive,
  iconName,
  isDark,
  onConfirm,
  onCancel,
}: ConfirmModalProps): React.JSX.Element | null {
  if (!visible) return null;

  const modalOverlay = colors.rassa.overlay;
  const surface = isDark ? colors.rassa.surfaceDark : colors.rassa.surface;
  const border = isDark ? colors.rassa.borderDark : colors.rassa.border;
  const fg = isDark ? colors.rassa.fgDark : colors.rassa.fg;
  const muted = isDark ? colors.rassa.mutedDark : colors.rassa.muted;

  const errorColor = colors.brandRedCoral;
  const errorBg = isDark ? colors.rassa.errorBgDark : colors.rassa.errorBg;
  const primaryColor = isDark ? colors.brandPrimaryDark : colors.brandPrimary;
  const primaryBg = isDark ? 'rgba(74,138,99,0.15)' : 'rgba(36,86,60,0.07)';

  const iconBg = isDestructive ? errorBg : primaryBg;
  const iconColor = isDestructive ? errorColor : primaryColor;
  const confirmBtnBg = isDestructive ? errorColor : primaryColor;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: modalOverlay }}
        onPress={onCancel}
      />
      <View
        style={{
          backgroundColor: surface,
          borderRadius: 24,
          padding: 24,
          paddingBottom: 34,
          marginTop: 'auto',
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: border,
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
              backgroundColor: iconBg,
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
              color: fg,
              textAlign: 'center',
            }}
          >
            {title}
          </Text>
          {description ? (
            <Text
              style={{
                fontSize: 14,
                color: muted,
                marginTop: 6,
                textAlign: 'center',
              }}
            >
              {description}
            </Text>
          ) : null}
        </View>
        <View style={{ gap: 10 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onConfirm}
            style={{
              height: 42,
              borderRadius: 10,
              backgroundColor: confirmBtnBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.iconWhite,
              }}
            >
              {confirmText}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onCancel}
            style={{
              height: 40,
              borderRadius: 10,
              borderWidth: 1.5,
              borderColor: border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: fg }}>
              {cancelText}
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
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    isDestructive: boolean;
    iconName: keyof typeof MaterialCommunityIcons.glyphMap;
    onConfirm: () => void;
  } | null>(null);
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
    },
  });

  const assignHeadMutation = useMutation({
    mutationFn: (userId: number) => assignFamilyHead(familyId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['family', familyId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteFamily(familyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['families'] });
      navigation.goBack();
    },
  });

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

  const showToast = (
    message: string,
    type: 'success' | 'error' = 'success',
  ): void => {
    setToastMessage(message);
    setToastType(type);
  };

  const handleDelete = (): void => {
    setConfirmConfig({
      title: 'Eliminar familia',
      description: `¿Estás seguro de eliminar "${family.nombre_familia}"? Esta acción desactivará la familia y todos sus miembros.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      isDestructive: true,
      iconName: 'delete-forever',
      onConfirm: () => {
        void deleteMutation.mutateAsync();
        setConfirmVisible(false);
      },
    });
    setConfirmVisible(true);
  };

  const handleRemoveMember = (member: FamilyMember): void => {
    // Bloquear si el miembro es el jefe de familia
    if (family.fk_jefe_familia === member.fk_usuario) {
      showToast(
        'No puedes remover al jefe de familia. Primero asigna otro jefe.',
        'error',
      );
      return;
    }

    setConfirmConfig({
      title: 'Remover miembro',
      description: `¿Remover a "${member.usuario_nombre}" de esta familia?`,
      confirmText: 'Remover',
      cancelText: 'Cancelar',
      isDestructive: true,
      iconName: 'account-remove',
      onConfirm: () => {
        void removeMemberMutation.mutateAsync(member.id_familia_usuario);
        setConfirmVisible(false);
      },
    });
    setConfirmVisible(true);
  };

  const handleAssignHead = (member: FamilyMember): void => {
    setConfirmConfig({
      title: 'Asignar jefe de familia',
      description: `¿Designar a "${member.usuario_nombre}" como jefe de familia?`,
      confirmText: 'Asignar',
      cancelText: 'Cancelar',
      isDestructive: false,
      iconName: 'account-star',
      onConfirm: () => {
        void assignHeadMutation.mutateAsync(member.fk_usuario);
        setConfirmVisible(false);
      },
    });
    setConfirmVisible(true);
  };

  const handleAddMember = (userId: number): void => {
    void addMemberMutation.mutateAsync(userId);
  };

  const bg = isDark ? colors.rassa.bgDark : colors.rassa.bg;
  const surface = isDark ? colors.rassa.surfaceDark : colors.rassa.surface;
  const fg = isDark ? colors.rassa.fgDark : colors.rassa.fg;
  const muted = isDark ? colors.rassa.mutedDark : colors.rassa.muted;
  const border = isDark ? colors.rassa.borderDark : colors.rassa.border;
  const btnBg = isDark ? colors.rassa.accentBgDark : colors.rassa.accentBg;
  const brand = isDark ? colors.brandPrimaryDark : colors.brandPrimary;
  const coral = colors.brandRedCoral;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 60,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: border,
          backgroundColor: surface,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => ({
            marginRight: 12,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={fg} />
        </Pressable>
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: fg,
          }}
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
            tintColor={brand}
          />
        }
      >
        {/* ── Family info card ──────────────────────────── */}
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: surface,
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
              style={{ flex: 1, fontSize: 20, fontWeight: '700', color: fg }}
            >
              {family.nombre_familia}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                style={{ borderRadius: 8, backgroundColor: btnBg, padding: 8 }}
                onPress={() => {
                  navigation.navigate('FamilyForm', {
                    familyId,
                  });
                }}
              >
                <MaterialCommunityIcons name="pencil" size={18} color={fg} />
              </Pressable>
              <Pressable
                style={{ borderRadius: 8, backgroundColor: btnBg, padding: 8 }}
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
              <Text style={{ marginLeft: 6, fontSize: 14, color: fg }}>
                Jefe: {family.jefe_nombre}
              </Text>
            </View>
          ) : null}

          {family.detalle_familia ? (
            <Text style={{ marginTop: 8, fontSize: 14, color: muted }}>
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
          <Text style={{ fontSize: 18, fontWeight: '700', color: fg }}>
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
              color={muted}
            />
            <Text style={{ marginTop: 12, fontSize: 14, color: muted }}>
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

      <ConfirmModal
        visible={confirmVisible && confirmConfig !== null ? true : false}
        title={confirmConfig?.title ?? ''}
        description={confirmConfig?.description ?? ''}
        confirmText={confirmConfig?.confirmText ?? ''}
        cancelText={confirmConfig?.cancelText ?? ''}
        isDestructive={confirmConfig?.isDestructive ?? false}
        iconName={confirmConfig?.iconName ?? 'alert-circle'}
        isDark={isDark}
        onConfirm={confirmConfig?.onConfirm ?? (() => {})}
        onCancel={() => setConfirmVisible(false)}
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

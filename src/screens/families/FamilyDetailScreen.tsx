/* global setTimeout, clearTimeout -- RN timer functions not in ESLint env */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
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
  const surface = isDark ? '#263028' : '#FFFFFF';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#353D35' : '#E2E6DF';
  const btnBg = isDark ? '#353D35' : '#F5F7F0';

  return (
    <View
      style={{
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: surface,
        padding: 12,
      }}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        <MaterialCommunityIcons
          name={isHead ? 'account-star' : 'account'}
          size={20}
          color={isHead ? '#3A6D56' : muted}
        />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: fg }}>
            {member.usuario_nombre}
          </Text>
          <Text style={{ fontSize: 12, color: muted }}>
            {member.usuario_correo}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 4 }}>
        {!isHead ? (
          <Pressable
            style={{ borderRadius: 8, backgroundColor: btnBg, padding: 8 }}
            onPress={() => onAssignHead(member)}
          >
            <MaterialCommunityIcons
              name="account-star"
              size={16}
              color="#3A6D56"
            />
          </Pressable>
        ) : null}
        <Pressable
          style={{ borderRadius: 8, backgroundColor: btnBg, padding: 8 }}
          onPress={() => onRemove(member)}
        >
          <MaterialCommunityIcons
            name="account-remove"
            size={16}
            color="#DE393A"
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

  const border = isDark ? '#353D35' : '#E2E6DF';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const pressedBg = isDark ? '#353D35' : '#F5F7F0';

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
        {results.map((user) => (
          <Pressable
            key={user.id_usuario}
            onPress={() => onSelect(user)}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: border,
              backgroundColor: pressed ? pressedBg : 'transparent',
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: fg }}>
              {user.nombre} {user.apellido_paterno}
            </Text>
            <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>
              {user.email} (ID: {user.id_usuario})
            </Text>
          </Pressable>
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
  const [results, setResults] = useState<SearchUserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUserResult | null>(null);
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
    if (!trimmed || trimmed.length < 2 || selectedUser) {
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

  const modalOverlay = 'rgba(0,0,0,0.4)';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const border = isDark ? '#353D35' : '#E2E6DF';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const inputBg = isDark ? '#1A211B' : '#F9FAF6';
  const primaryBg = isDark ? 'rgba(74,138,99,0.15)' : 'rgba(36,86,60,0.07)';
  const primaryColor = isDark ? '#4A8A63' : '#24563C';
  const disabledBg = isDark ? '#353D35' : '#E2E6DF';
  const pressedBg = isDark ? '#353D35' : '#F5F7F0';
  const errorColor = '#DE393A';
  const errorBg = isDark ? '#3D2023' : '#FDEDEE';

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
              paddingRight: selectedUser ?? query ? 40 : 16,
              paddingVertical: 12,
              fontSize: 16,
              color: fg,
            }}
            placeholder="Nombre o correo..."
            placeholderTextColor={muted}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (selectedUser) setSelectedUser(null);
            }}
            editable={!isPending}
          />
          {selectedUser ?? query ? (
            <Pressable
              onPress={() => {
                setQuery('');
                setSelectedUser(null);
                setResults([]);
              }}
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
          onSelect={(user) => {
            setSelectedUser(user);
            setQuery(`${user.nombre} ${user.apellido_paterno} (${user.email})`);
            setResults([]);
          }}
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
        <View style={{ gap: 10, marginTop: 20 }}>
          <Pressable
            onPress={() => {
              if (selectedUser) {
                onConfirm(selectedUser.id_usuario);
              }
            }}
            disabled={!selectedUser || isPending}
            style={({ pressed }) => ({
              height: 50,
              borderRadius: 14,
              backgroundColor: selectedUser ? primaryColor : disabledBg,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            {isPending ? (
              <ActivityIndicator size={16} color={colors.iconWhite} />
            ) : null}
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.iconWhite }}>
              Agregar
            </Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            disabled={isPending}
            style={({ pressed }) => ({
              height: 44,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: border,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? pressedBg : 'transparent',
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>
              Cancelar
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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

  const modalOverlay = 'rgba(0,0,0,0.4)';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const border = isDark ? '#353D35' : '#E2E6DF';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';

  const errorColor = '#DE393A';
  const errorBg = isDark ? '#3D2023' : '#FDEDEE';
  const primaryColor = isDark ? '#4A8A63' : '#24563C';
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
          <Pressable
            onPress={onConfirm}
            style={({ pressed }) => ({
              height: 50,
              borderRadius: 14,
              backgroundColor: confirmBtnBg,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text className="text-sm font-semibold text-white">
              {confirmText}
            </Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => ({
              height: 44,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: border,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>
              {cancelText}
            </Text>
          </Pressable>
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

  const showToast = (message: string, type: 'success' | 'error' = 'success'): void => {
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

  const bg = isDark ? '#1A211B' : '#F5F7F0';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#353D35' : '#E2E6DF';
  const btnBg = isDark ? '#353D35' : '#F5F7F0';
  const brand = isDark ? '#4A8A63' : '#24563C';
  const coral = '#DE393A';

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
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={fg}
          />
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ flex: 1, fontSize: 20, fontWeight: '700', color: fg }}>
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
                <MaterialCommunityIcons
                  name="pencil"
                  size={18}
                  color={fg}
                />
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
            <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name="account-star"
                size={16}
                color="#3A6D56"
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
        <View style={{ marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: fg }}>
            Miembros
          </Text>
          <Pressable
            style={({ pressed }) => ({
              borderRadius: 8,
              backgroundColor: coral,
              paddingHorizontal: 12,
              paddingVertical: 6,
              opacity: pressed ? 0.9 : 1,
            })}
            onPress={() => setAddModalVisible(true)}
          >
            <Text className="text-sm font-semibold text-white">Agregar</Text>
          </Pressable>
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

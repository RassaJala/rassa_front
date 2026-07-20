import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { colors } from '@/constants/colors';
import {
  addFamilyMember,
  assignFamilyHead,
  deleteFamily,
  fetchFamily,
  fetchFamilyMembers,
  removeFamilyMember,
} from '@/services/families';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList, Family, FamilyMember } from '@/types';

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
  return (
    <View
      className={`mb-2 flex-row items-center justify-between rounded-xl border p-3 ${
        isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
      }`}
    >
      <View className="flex-1 flex-row items-center">
        <MaterialCommunityIcons
          name={isHead ? 'account-star' : 'account'}
          size={20}
          color={
            isHead
              ? colors.brandGreenForest
              : isDark
                ? colors.textTertiary
                : colors.textSecondary
          }
        />
        <View className="ml-3 flex-1">
          <Text
            className={`text-sm font-semibold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {member.usuario_nombre}
          </Text>
          <Text className="text-xs text-gray-400 dark:text-gray-500">
            {member.usuario_correo}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-1">
        {!isHead ? (
          <Pressable
            className="rounded-lg bg-gray-200 p-2 dark:bg-gray-700"
            onPress={() => onAssignHead(member)}
          >
            <MaterialCommunityIcons
              name="account-star"
              size={16}
              color={colors.brandGreenForest}
            />
          </Pressable>
        ) : null}
        <Pressable
          className="rounded-lg bg-gray-200 p-2 dark:bg-gray-700"
          onPress={() => onRemove(member)}
        >
          <MaterialCommunityIcons
            name="account-remove"
            size={16}
            color={colors.brandRedCoral}
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
  readonly userId: string;
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly onChangeUserId: (value: string) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

function AddMemberModal({
  visible,
  isDark,
  userId,
  isPending,
  isError,
  onChangeUserId,
  onConfirm,
  onCancel,
}: AddMemberModalProps): React.JSX.Element | null {
  if (!visible) return null;

  return (
    <View className="absolute inset-0 items-center justify-center bg-black/50">
      <View
        className={`mx-6 w-full max-w-sm rounded-2xl p-6 ${
          isDark ? 'bg-gray-900' : 'bg-white'
        }`}
      >
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          Agregar miembro
        </Text>
        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Ingresa el ID del usuario a agregar.
        </Text>

        <TextInput
          className={`mt-4 rounded-xl border px-4 py-3 text-base ${
            isDark
              ? 'border-gray-700 bg-gray-800 text-white'
              : 'border-gray-300 bg-gray-50 text-gray-900'
          }`}
          placeholder="ID del usuario"
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
          keyboardType="numeric"
          value={userId}
          onChangeText={onChangeUserId}
        />

        {isError ? (
          <Text className="mt-2 text-sm text-brand-red-coral">
            Error al agregar miembro. Verifica el ID.
          </Text>
        ) : null}

        <View className="mt-5 flex-row justify-end gap-3">
          <Pressable
            className="rounded-xl bg-gray-200 px-4 py-2.5 dark:bg-gray-700"
            onPress={onCancel}
          >
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Cancelar
            </Text>
          </Pressable>
          <Pressable
            className="rounded-xl bg-brand-green-forest px-4 py-2.5"
            onPress={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={colors.iconWhite} />
            ) : (
              <Text className="text-sm font-semibold text-white">Agregar</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
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
  const [userIdInput, setUserIdInput] = useState('');

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
      setUserIdInput('');
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

  const handleDelete = (): void => {
    Alert.alert(
      'Eliminar familia',
      `¿Estás seguro de eliminar "${family.nombre_familia}"? Esta acción desactivará la familia y todos sus miembros.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => void deleteMutation.mutateAsync(),
        },
      ],
    );
  };

  const handleRemoveMember = (member: FamilyMember): void => {
    Alert.alert(
      'Remover miembro',
      `¿Remover a "${member.usuario_nombre}" de esta familia?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () =>
            void removeMemberMutation.mutateAsync(member.id_familia_usuario),
        },
      ],
    );
  };

  const handleAssignHead = (member: FamilyMember): void => {
    Alert.alert(
      'Asignar jefe de familia',
      `¿Designar a "${member.usuario_nombre}" como jefe de familia?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Asignar',
          onPress: () => void assignHeadMutation.mutateAsync(member.fk_usuario),
        },
      ],
    );
  };

  const handleAddMember = (): void => {
    const id = Number(userIdInput);
    if (!id || id <= 0) return;
    void addMemberMutation.mutateAsync(id);
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetchFamily();
              void refetchMembers();
            }}
          />
        }
      >
        {/* ── Family info card ──────────────────────────── */}
        <View
          className={`rounded-2xl border p-5 ${
            isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
          }`}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              {family.nombre_familia}
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                className="rounded-lg bg-gray-200 p-2 dark:bg-gray-700"
                onPress={() => {
                  navigation.navigate('FamilyForm', {
                    familyId,
                  });
                }}
              >
                <MaterialCommunityIcons
                  name="pencil"
                  size={18}
                  color={isDark ? colors.iconWhite : colors.iconDark}
                />
              </Pressable>
              <Pressable
                className="rounded-lg bg-gray-200 p-2 dark:bg-gray-700"
                onPress={handleDelete}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={18}
                  color={colors.brandRedCoral}
                />
              </Pressable>
            </View>
          </View>

          {family.jefe_nombre ? (
            <View className="mt-3 flex-row items-center">
              <MaterialCommunityIcons
                name="account-star"
                size={16}
                color={colors.brandGreenForest}
              />
              <Text className="ml-1.5 text-sm text-gray-600 dark:text-gray-300">
                Jefe: {family.jefe_nombre}
              </Text>
            </View>
          ) : null}

          {family.detalle_familia ? (
            <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {family.detalle_familia}
            </Text>
          ) : null}
        </View>

        {/* ── Members section ───────────────────────────── */}
        <View className="mt-6 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            Miembros
          </Text>
          <Pressable
            className="rounded-lg bg-brand-green-forest px-3 py-1.5"
            onPress={() => setAddModalVisible(true)}
          >
            <Text className="text-sm font-semibold text-white">Agregar</Text>
          </Pressable>
        </View>

        {(members ?? []).length === 0 ? (
          <View className="items-center pt-10">
            <MaterialCommunityIcons
              name="account-group-outline"
              size={48}
              color={colors.iconMuted}
            />
            <Text className="mt-3 text-sm text-gray-400 dark:text-gray-500">
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
        userId={userIdInput}
        isPending={addMemberMutation.isPending}
        isError={addMemberMutation.isError}
        onChangeUserId={setUserIdInput}
        onConfirm={handleAddMember}
        onCancel={() => {
          setAddModalVisible(false);
          setUserIdInput('');
        }}
      />
    </View>
  );
}

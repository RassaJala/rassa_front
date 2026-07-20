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
import type {
  AdminStackParamList,
  Family,
  FamilyMember,
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
  readonly userId: string;
  readonly isPending: boolean;
  readonly errorMsg: string | null;
  readonly onChangeUserId: (value: string) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

function AddMemberModal({
  visible,
  isDark,
  userId,
  isPending,
  errorMsg,
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

        {errorMsg ? (
          <Text className="mt-2 text-sm text-brand-red-coral">
            {errorMsg}
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
            className="rounded-xl bg-brand-red-coral px-4 py-2.5"
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyBetween: 'space-between' }}>
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
        userId={userIdInput}
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
        onChangeUserId={setUserIdInput}
        onConfirm={handleAddMember}
        onCancel={() => {
          setAddModalVisible(false);
          setUserIdInput('');
          addMemberMutation.reset();
        }}
      />
    </View>
  );
}

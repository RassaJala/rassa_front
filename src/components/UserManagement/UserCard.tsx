import React from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { ROLE_COLOR_MAP } from '@/constants/roles';
import type { AdminUser } from '@/types/userManagement';
import { getRoleLabel } from '@/utils/labels';
import { getFullName, getRoleBadgeBg } from '@/utils/userManagement';

interface UserCardProps {
  user: AdminUser;
  isSelf: boolean;
  onTogglePress: (user: AdminUser) => void;
  onRolePress: (user: AdminUser) => void;
}

export default function UserCard({
  user,
  isSelf,
  onTogglePress,
  onRolePress,
}: UserCardProps): React.JSX.Element {
  return (
    <View className="mx-4 mb-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      {/* Top row: name + role badge */}
      <View className="mb-3 flex-row items-center justify-between">
        <View className="mr-2 flex-1">
          <Text
            className="text-base font-semibold text-brand-ink dark:text-gray-100"
            numberOfLines={1}
          >
            {getFullName(user)}
          </Text>
          <Text
            className="text-sm text-gray-500 dark:text-gray-400"
            numberOfLines={1}
          >
            {user.email}
          </Text>
        </View>

        <Pressable
          onPress={() => onRolePress(user)}
          className="rounded-full px-3 py-1"
          style={{ backgroundColor: getRoleBadgeBg(user.role) }}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: ROLE_COLOR_MAP[user.role] ?? '#6b7280' }}
          >
            {getRoleLabel(user.role)}
          </Text>
        </Pressable>
      </View>

      {/* Bottom row: toggle + change role button */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Switch
            value={user.estado}
            onValueChange={() => onTogglePress(user)}
            disabled={isSelf}
            trackColor={{
              false: colors.border,
              true: colors.success,
            }}
            thumbColor={
              isSelf
                ? colors.iconMuted
                : user.estado
                  ? colors.primary
                  : colors.iconMuted
            }
          />
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            {user.estado ? 'Activo' : 'Inactivo'}
          </Text>
          {isSelf ? (
            <View className="rounded bg-amber-100 px-1.5 py-0.5 dark:bg-amber-900">
              <Text className="text-xs text-amber-700 dark:text-amber-300">
                tú
              </Text>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={() => onRolePress(user)}
          className="flex-row items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 dark:bg-gray-800"
        >
          <MaterialCommunityIcons
            name="account-cog-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Text className="text-sm text-gray-600 dark:text-gray-400">Rol</Text>
        </Pressable>
      </View>
    </View>
  );
}

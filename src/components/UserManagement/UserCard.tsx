import React from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ROLE_COLOR_MAP } from '@/constants/roles';
import { useTheme } from '@/store/ThemeContext';
import type { AdminUser } from '@/types/userManagement';
import { getRoleLabel } from '@/utils/labels';
import { getFullName, getRoleBadgeBg } from '@/utils/userManagement';

interface UserCardProps {
  user: AdminUser;
  isSelf: boolean;
  onTogglePress: (user: AdminUser) => void;
  onRolePress: (user: AdminUser) => void;
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- UI component with theme-driven inline styles
export default function UserCard({
  user,
  isSelf,
  onTogglePress,
  onRolePress,
}: UserCardProps): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#353D35' : '#E2E6DF';
  const brand = isDark ? '#4A8A63' : '#24563C';
  const amberBg = isDark ? 'rgba(212,160,32,0.2)' : '#FEF3C7';
  const amberFg = isDark ? '#F2A900' : '#D97706';
  const isActive = user.estado;
  const bgDisabled = isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB';
  const bgEnabled = isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6';
  const textDisabled = isDark ? 'rgba(255,255,255,0.2)' : '#D1D5DB';
  const roleBtnBg = isSelf ? bgDisabled : bgEnabled;
  const roleBtnTextColor = isSelf ? textDisabled : muted;
  const thumbColor = isSelf ? muted : (isActive ? brand : muted);
  const showTuBadge = isSelf;
  const roleBadgeOpacity = isSelf ? 0.5 : 1;
  const stateText = isActive ? 'Activo' : 'Inactivo';

  return (
    <View
      style={{
        backgroundColor: surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: border,
        padding: 16,
      }}
    >
      {/* Top row: name + role badge */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: fg,
            }}
            numberOfLines={1}
          >
            {getFullName(user)}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: muted,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {user.email}
          </Text>
        </View>

        <Pressable
          onPress={() => onRolePress(user)}
          disabled={isSelf}
          style={{
            backgroundColor: getRoleBadgeBg(user.role),
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 4,
            opacity: roleBadgeOpacity,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: ROLE_COLOR_MAP[user.role] ?? muted,
            }}
          >
            {getRoleLabel(user.role)}
          </Text>
        </Pressable>
      </View>

      {/* Bottom row: toggle + change role button */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Switch
            value={isActive}
            onValueChange={() => onTogglePress(user)}
            disabled={isSelf}
            trackColor={{
              false: border,
              true: brand,
            }}
            thumbColor={thumbColor}
          />
          <Text
            style={{
              fontSize: 14,
              color: muted,
            }}
          >
            {stateText}
          </Text>
          {showTuBadge ? (
            <View
              style={{
                backgroundColor: amberBg,
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: amberFg,
                  fontWeight: '600',
                }}
              >
                tú
              </Text>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={() => onRolePress(user)}
          disabled={isSelf}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: roleBtnBg,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <MaterialCommunityIcons
            name="account-cog-outline"
            size={16}
            color={roleBtnTextColor}
          />
          <Text
            style={{
              fontSize: 14,
              color: roleBtnTextColor,
            }}
          >
            Rol
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

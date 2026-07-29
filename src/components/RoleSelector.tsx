import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { ROLE_OPTIONS } from '@/constants/roles';

interface RoleSelectorProps {
  readonly role: string;
  readonly onChangeRole: (role: string) => void;
  readonly isDark: boolean;
  readonly label?: string;
  readonly disabled?: boolean;
}

export default function RoleSelector({
  role,
  onChangeRole,
  isDark,
  label = 'Rol del usuario *',
  disabled = false,
}: RoleSelectorProps): React.JSX.Element {
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const segBg = isDark ? colors.admSegBgD : colors.admSegBgL;
  const accentBg = isDark ? colors.admActiveBgD : colors.admActiveBgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;

  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.08,
          textTransform: 'uppercase',
          color: muted,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {ROLE_OPTIONS.map((opt) => {
          const isActive = role === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChangeRole(opt.value)}
              disabled={disabled}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: isActive ? brand : border,
                backgroundColor: isActive ? accentBg : segBg,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: disabled ? 0.6 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isActive ? brand : muted,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { ROLE_FILTERS, STATUS_FILTERS } from '@/constants/roles';
import { useTheme } from '@/store/ThemeContext';

interface FilterBarProps {
  roleFilter: string;
  statusFilter: string;
  onRoleFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
}

export default function FilterBar({
  roleFilter,
  statusFilter,
  onRoleFilterChange,
  onStatusFilterChange,
}: FilterBarProps): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#353D35' : '#E2E6DF';
  const brand = isDark ? '#4A8A63' : '#24563C';
  const chipBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const iconWhite = '#FFFFFF';

  return (
    <View>
      {/* Rol filter */}
      <View style={{ marginBottom: 8 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.08,
            textTransform: 'uppercase',
            color: muted,
            marginBottom: 6,
          }}
        >
          Rol
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ROLE_FILTERS.map((opt) => {
            const isSelected = opt.value === null
              ? roleFilter === ''
              : roleFilter === opt.value;

            return (
              <Pressable
                key={String(opt.value)}
                onPress={() => onRoleFilterChange(opt.value ?? '')}
                style={{
                  backgroundColor: isSelected ? brand : chipBg,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: isSelected ? iconWhite : muted,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: border, marginVertical: 12 }} />

      {/* Status filter */}
      <View>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.08,
            textTransform: 'uppercase',
            color: muted,
            marginBottom: 6,
          }}
        >
          Estado
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {STATUS_FILTERS.map((opt) => {
            const isSelected = opt.value === null
              ? statusFilter === ''
              : statusFilter === opt.value;

            return (
              <Pressable
                key={String(opt.value)}
                onPress={() => onStatusFilterChange(opt.value ?? '')}
                style={{
                  backgroundColor: isSelected ? brand : chipBg,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: isSelected ? iconWhite : muted,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

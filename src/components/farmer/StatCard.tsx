import React from 'react';
import { Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { themeColors } from '@/constants/colors';

interface StatCardProps {
  icon: string;
  value: number | string;
  label: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  isCompact: boolean;
  isDark: boolean;
}

export default function StatCard({
  icon,
  value,
  label,
  iconBg,
  iconColor,
  valueColor,
  isCompact,
  isDark,
}: StatCardProps): React.JSX.Element {
  const theme = themeColors(isDark);

  return (
    <View
      style={{
        flex: 1,
        minWidth: isCompact ? '45%' : 0,
        alignItems: 'center',
        backgroundColor: theme.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        paddingVertical: isCompact ? 14 : 18,
        paddingHorizontal: isCompact ? 6 : 10,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: iconBg,
          marginBottom: 10,
        }}
      >
        <MaterialCommunityIcons
          name={icon as never}
          size={24}
          color={iconColor}
        />
      </View>
      <Text
        style={{
          fontSize: 22,
          fontWeight: '700',
          letterSpacing: -0.2,
          color: valueColor,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: isCompact ? 11 : 13,
          fontWeight: '600',
          letterSpacing: 0.06,
          textTransform: 'uppercase',
          color: theme.muted,
          marginTop: 4,
          textAlign: 'center',
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </View>
  );
}

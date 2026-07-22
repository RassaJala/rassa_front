import React from 'react';
import { Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

interface StatCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: string | number;
  label: string;
  surface: string;
  border: string;
  muted: string;
  iconBg: string;
  iconColor: string;
}

export default function StatCard({
  icon,
  value,
  label,
  surface,
  border,
  muted,
  iconBg,
  iconColor,
}: StatCardProps): React.JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        backgroundColor: surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: border,
        paddingVertical: 18,
        paddingHorizontal: 10,
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
        <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
      </View>
      <Text
        style={{
          fontSize: 22,
          fontWeight: '700',
          letterSpacing: -0.2,
          color: iconColor,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          letterSpacing: 0.06,
          textTransform: 'uppercase',
          color: muted,
          marginTop: 4,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { themeColors } from '@/constants/colors';

interface QuickActionCardProps {
  icon: string;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
  isDark: boolean;
  onPress: () => void;
}

export default function QuickActionCard({
  icon,
  title,
  description,
  iconBg,
  iconColor,
  isDark,
  onPress,
}: QuickActionCardProps): React.JSX.Element {
  const theme = themeColors(isDark);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 14,
          marginBottom: 10,
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
          }}
        >
          <MaterialCommunityIcons
            name={icon as never}
            size={22}
            color={iconColor}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: theme.fg,
              marginBottom: 2,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: theme.muted,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {description}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

import React from 'react';
import { Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';

interface FormErrorBannerProps {
  readonly message: string | null | undefined;
  readonly isDark: boolean;
}

export default function FormErrorBanner({
  message,
  isDark,
}: FormErrorBannerProps): React.JSX.Element | null {
  if (!message) return null;
  const errorColor = isDark ? colors.admErrorTextD : colors.admErrorTextL;

  return (
    <View
      style={{
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <MaterialCommunityIcons
        name="alert-circle"
        size={16}
        color={errorColor}
      />
      <Text style={{ marginLeft: 6, fontSize: 14, color: errorColor }}>
        {message}
      </Text>
    </View>
  );
}

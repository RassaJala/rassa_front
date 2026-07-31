import React from 'react';
import { TextInput, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Buscar productos...',
}: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;

  return (
    <View
      className="flex-row items-center rounded-xl px-4 py-3"
      style={{
        backgroundColor: surface,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <MaterialCommunityIcons
        name="magnify"
        size={20}
        color={muted}
        style={{ marginRight: 8 }}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        className="flex-1 text-base"
        style={{ color: fg }}
      />
    </View>
  );
}

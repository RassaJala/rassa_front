import React from 'react';
import { Pressable } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';

type Props = {
  onPress: () => void;
  iconSize?: number;
};

/** Botón circular con flecha hacia atrás, usado en headers de pantallas. */
export default function HeaderBackButton({
  onPress,
  iconSize = 22,
}: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const fg = isDark ? colors.admFgD : colors.admFgL;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: surface,
        borderWidth: 1,
        borderColor: border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <MaterialCommunityIcons name="arrow-left" size={iconSize} color={fg} />
    </Pressable>
  );
}

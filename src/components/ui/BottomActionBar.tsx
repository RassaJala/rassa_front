import React from 'react';
import { View } from 'react-native';

import { colors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';

type Props = {
  children: React.ReactNode;
};

/** Barra inferior absoluta que se superpone al contenido. */
export default function BottomActionBar({
  children,
}: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const border = isDark ? colors.admBorderD : colors.admBorderL;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: surface,
        borderTopWidth: 1,
        borderTopColor: border,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 32,
      }}
    >
      {children}
    </View>
  );
}

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';
import type { RecoleccionEstado } from '@/types/recolecciones';

import { FILTROS } from './constants';

interface FilterChipsProps {
  readonly filter: RecoleccionEstado | '';
  readonly onSelect: (value: RecoleccionEstado | '') => void;
}

export default function FilterChips({
  filter,
  onSelect,
}: FilterChipsProps): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const white = colors.iconWhite;

  const itemsPerRow = Math.ceil(FILTROS.length / 2);
  const rows = Array.from({ length: 2 }, (_, i) =>
    FILTROS.slice(i * itemsPerRow, (i + 1) * itemsPerRow),
  );

  return (
    <View style={{ gap: 6 }}>
      {rows.map((row, ri) =>
        row.length > 0 ? (
          <View
            key={ri}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
            }}
          >
            {row.map((e) => {
              const selected = filter === e.value;
              return (
                <Pressable
                  key={e.value}
                  onPress={() => onSelect(e.value)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: selected ? brand : colors.transparent,
                    borderWidth: 1.5,
                    borderColor: selected ? brand : border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: selected ? white : fg,
                    }}
                  >
                    {e.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null,
      )}
    </View>
  );
}

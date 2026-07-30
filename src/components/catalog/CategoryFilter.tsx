import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';

import { colors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';

interface Category {
  readonly id_categoria: number;
  readonly nombre: string;
}

interface Props {
  categories: readonly Category[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}

export default function CategoryFilter({
  categories,
  selected,
  onSelect,
}: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;

  const allSelected = selected === null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {/* "All" chip */}
      <Pressable
        onPress={() => onSelect(null)}
        className="rounded-full px-4 py-2"
        style={{
          backgroundColor: allSelected ? brand : surface,
          borderWidth: 1,
          borderColor: allSelected ? brand : border,
        }}
      >
        <Text
          className="text-sm font-medium"
          style={{ color: allSelected ? colors.iconWhite : fg }}
        >
          Todos
        </Text>
      </Pressable>

      {categories.map((cat) => {
        const isSelected = selected === cat.id_categoria;
        return (
          <Pressable
            key={cat.id_categoria}
            onPress={() => onSelect(cat.id_categoria)}
            className="rounded-full px-4 py-2"
            style={{
              backgroundColor: isSelected ? brand : surface,
              borderWidth: 1,
              borderColor: isSelected ? brand : border,
            }}
          >
            <Text
              className="text-sm font-medium"
              style={{ color: isSelected ? colors.iconWhite : fg }}
            >
              {cat.nombre}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

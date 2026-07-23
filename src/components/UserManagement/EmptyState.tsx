import React from "react";
import { Text, View } from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useTheme } from "@/store/ThemeContext";

interface EmptyStateProps {
  hasFilters: boolean;
}

export default function EmptyState({
  hasFilters,
}: EmptyStateProps): React.JSX.Element {
  const { colorScheme } = useTheme();
  const muted = colorScheme === "dark" ? "#9DA89D" : "#5E6B5E";

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        paddingVertical: 80,
      }}
    >
      <MaterialCommunityIcons
        name="account-search-outline"
        size={64}
        color={muted}
      />
      <Text
        style={{
          marginTop: 16,
          textAlign: "center",
          fontSize: 15,
          color: muted,
        }}
      >
        {hasFilters
          ? "No se encontraron usuarios con esos filtros."
          : "No hay usuarios registrados."}
      </Text>
    </View>
  );
}

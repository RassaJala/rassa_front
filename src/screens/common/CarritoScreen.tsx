import React from "react";
import { Text, View } from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors } from "@/constants/colors";
import { useTheme } from "@/store/ThemeContext";

export default function CarritoScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;

  return (
    <View style={{ flex: 1, backgroundColor: bg, padding: 16 }}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons name="cart-outline" size={64} color={muted} />
        <Text
          style={{
            marginTop: 16,
            fontSize: 22,
            fontWeight: "700",
            color: fg,
            letterSpacing: -0.3,
          }}
        >
          Carrito
        </Text>
        <Text
          style={{
            marginTop: 8,
            fontSize: 14,
            color: muted,
            textAlign: "center",
          }}
        >
          Aquí aparecerán los productos agregados al carrito.
        </Text>
      </View>
    </View>
  );
}

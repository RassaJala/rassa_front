import React from "react";
import { Text, View } from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors } from "@/constants/colors";
import { useAuth } from "@/store/AuthContext";
import { useTheme } from "@/store/ThemeContext";

export default function ProfileSellerScreen(): React.JSX.Element {
  const { user } = useAuth();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;

  return (
    <View style={{ flex: 1, backgroundColor: bg, padding: 16 }}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: surface,
            borderWidth: 1,
            borderColor: border,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <MaterialCommunityIcons
            name="account-outline"
            size={40}
            color={brand}
          />
        </View>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: fg,
            letterSpacing: -0.3,
          }}
        >
          {user?.first_name ?? "Usuario"}
        </Text>
        <Text
          style={{
            marginTop: 4,
            fontSize: 14,
            color: muted,
          }}
        >
          {user?.email}
        </Text>
      </View>
    </View>
  );
}

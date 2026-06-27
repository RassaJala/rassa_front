import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { colors } from "../../constants/colors";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const BG_COLORS = {
  primary: colors.primary,
  outline: "transparent",
  danger: colors.error,
};

const TEXT_COLORS = {
  primary: "#ffffff",
  outline: colors.primary,
  danger: "#ffffff",
};

export default function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.base,
        { backgroundColor: BG_COLORS[variant] },
        variant === "outline" && styles.outline,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={TEXT_COLORS[variant]} size="small" />
      ) : (
        <Text style={[styles.text, { color: TEXT_COLORS[variant] }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.55,
  },
});

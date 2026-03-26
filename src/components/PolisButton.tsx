import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  GestureResponderEvent,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";

type PolisButtonVariant = "primary" | "secondary" | "ghost";

interface PolisButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void | Promise<void>;
  variant?: PolisButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function PolisButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  style,
  textStyle,
}: PolisButtonProps) {
  const containerStyles = [
    styles.base,
    variant === "primary" && styles.primary,
    variant === "secondary" && styles.secondary,
    variant === "ghost" && styles.ghost,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.textBase,
    variant === "primary" && styles.textPrimary,
    variant === "secondary" && styles.textSecondary,
    variant === "ghost" && styles.textGhost,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={containerStyles}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Text style={textStyles}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: "#020617", // azul bem escuro
  },
  secondary: {
    backgroundColor: "#e5e7eb",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  disabled: {
    opacity: 0.6,
  },
  textBase: {
    fontSize: 16,
    fontWeight: "600",
  },
  textPrimary: {
    color: "#ffffff",
  },
  textSecondary: {
    color: "#111827",
  },
  textGhost: {
    color: "#111827",
  },
});

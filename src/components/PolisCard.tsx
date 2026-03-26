import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";

interface PolisCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function PolisCard({ children, style }: PolisCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
});

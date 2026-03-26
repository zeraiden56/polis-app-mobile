import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";

interface PolisInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export function PolisInput({
  label,
  error,
  containerStyle,
  labelStyle,
  style,
  ...rest
}: PolisInputProps) {
  return (
    <View style={containerStyle}>
      {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}

      <TextInput
        style={[styles.input, style]}
        placeholderTextColor="#A0A0A0"
        {...rest}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  error: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 2,
  },
});

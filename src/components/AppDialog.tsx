import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../theme/colors";

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
};

export default function AppDialog({
  visible,
  title,
  message,
  type = "info",
  onClose,
}: Props) {
  const iconName =
    type === "success"
      ? "checkmark-circle"
      : type === "error"
      ? "alert-circle"
      : "information-circle";

  const iconColor =
    type === "success"
      ? "#16a34a"
      : type === "error"
      ? Colors.danger
      : Colors.primary;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Ionicons name={iconName} size={36} color={iconColor} />
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Ok</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 8,
    textAlign: "center",
  },
  message: {
    marginTop: 6,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
  },
  button: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
});

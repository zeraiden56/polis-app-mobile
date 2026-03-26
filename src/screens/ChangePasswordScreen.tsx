// src/screens/ChangePasswordScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import { useAuth } from "../hooks/useAuth";
import { apiChangePassword } from "../api/auth";

export default function ChangePasswordScreen() {
  const { token, user, setUserFromProfile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  function validatePassword(pwd: string) {
    // regra simples: 8+ chars, 1 número, 1 letra
    const hasMin = pwd.length >= 8;
    const hasNumber = /\d/.test(pwd);
    const hasLetter = /[A-Za-z]/.test(pwd);
    return hasMin && hasNumber && hasLetter;
  }

  async function handleChange() {
    if (!token) {
      Alert.alert("Sessão expirada", "Faça login novamente para continuar.");
      return;
    }

    if (!currentPassword || !newPassword || !confirm) {
      Alert.alert("Atenção", "Preencha todos os campos.");
      return;
    }

    if (newPassword !== confirm) {
      Alert.alert("Erro", "A confirmação da senha não confere.");
      return;
    }

    if (!validatePassword(newPassword)) {
      Alert.alert(
        "Senha fraca",
        "Use pelo menos 8 caracteres, com letras e números."
      );
      return;
    }

    try {
      setLoading(true);

      // bate na API exatamente como o backend espera
      const res = await apiChangePassword(token, {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirm,
      });

      // se chegou aqui, status foi 200 (handleResponse não lançou erro)
      if (user) {
        // marca no contexto que não precisa mais trocar a senha
        setUserFromProfile({
          ...user,
          must_change_password: false,
        });
      }

      Alert.alert("Tudo certo", res.message || "Senha alterada com sucesso!");
      // AppNavigator vai ver mustChangePassword = false e mandar pra Home
    } catch (e: any) {
      if (__DEV__) console.log("Erro ao alterar senha", e);
      Alert.alert(
        "Erro",
        e?.message || "Falha na comunicação com o servidor."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Defina uma nova senha</Text>
        <Text style={styles.subtitle}>
          Por segurança, altere a senha padrão para continuar usando o Polis
          Ponto.
        </Text>

        <Text style={styles.label}>Senha atual</Text>
        <TextInput
          secureTextEntry
          style={styles.input}
          placeholder="Senha atual"
          placeholderTextColor="#A0A0A0"
          onChangeText={setCurrentPassword}
          value={currentPassword}
        />

        <Text style={styles.label}>Nova senha</Text>
        <TextInput
          secureTextEntry
          style={styles.input}
          placeholder="Nova senha"
          placeholderTextColor="#A0A0A0"
          onChangeText={setNewPassword}
          value={newPassword}
        />

        <Text style={styles.label}>Confirmar nova senha</Text>
        <TextInput
          secureTextEntry
          style={styles.input}
          placeholder="Confirmar nova senha"
          placeholderTextColor="#A0A0A0"
          onChangeText={setConfirm}
          value={confirm}
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.5 }]}
          onPress={handleChange}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Salvando..." : "Salvar e continuar"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 24,
  },
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
    marginBottom: 16,
    fontSize: 14,
  },
  button: {
    backgroundColor: "#020617",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});

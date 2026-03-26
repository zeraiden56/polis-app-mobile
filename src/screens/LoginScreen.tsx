import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import * as SecureStore from "expo-secure-store";

import { useAuth } from "../hooks/useAuth";
import { Colors } from "../theme/colors";
import { toAbsoluteUrl } from "../api/config";
import AppDialog from "../components/AppDialog";

/* =========================
   CPF FORMAT
========================= */
function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  let f = digits;
  if (digits.length > 3) f = `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length > 6)
    f = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  if (digits.length > 9)
    f = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
      6,
      9
    )}-${digits.slice(9)}`;
  return { raw: digits, formatted: f };
}

export default function LoginScreen() {
  const { login, biometricLogin } = useAuth();

  const [cpfMasked, setCpfMasked] = useState("");
  const [cpfRaw, setCpfRaw] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message?: string;
  } | null>(null);

  const [savedUser, setSavedUser] = useState<{
    cpf: string;
    avatar?: string;
    name?: string;
  } | null>(null);

  /* =========================
     LOAD SAVED USER
  ========================== */
  useEffect(() => {
    (async () => {
      const savedCpf = await SecureStore.getItemAsync("cpf");
      const avatar = await SecureStore.getItemAsync("avatar_url");
      const avatarAbs = avatar ? toAbsoluteUrl(avatar) : undefined;
      const name = await SecureStore.getItemAsync("name");
      const savedToken = await SecureStore.getItemAsync("auth_token");

      if (savedCpf && savedToken) {
        setSavedUser({
          cpf: savedCpf,
          avatar: avatarAbs ?? undefined,
          name: name ?? undefined,
        });
        setCpfRaw(savedCpf);
        setCpfMasked(formatCpf(savedCpf).formatted);
      }
    })();
  }, []);

  /* =========================
     BIOMETRIC LOGIN
  ========================== */
  async function loginWithBiometrics() {
    if (!savedUser) return;

    setLoading(true);
    const ok = await biometricLogin();
    if (!ok) setError("Falha no login biometrico.");
    setLoading(false);
  }

  /* =========================
     NORMAL LOGIN
  ========================== */
  async function handleLogin() {
    setError(null);

    if (!cpfRaw || cpfRaw.length != 11) {
      setError("Informe um CPF valido.");
      return;
    }

    if (!password) {
      setError("Informe a senha.");
      return;
    }

    setLoading(true);

    try {
      const ok = await login(cpfRaw, password, rememberMe);
      if (!ok) {
        setError("Credenciais invalidas.");
        return;
      }

      if (rememberMe) {
        await SecureStore.setItemAsync("cpf", cpfRaw);
      }
    } catch {
      setError("Falha ao fazer login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* HEADER */}
      <View style={styles.header}>
        {/* LOGO COM FUNDO */}
        <View style={styles.logoBox}>
          <Image
            source={require("../../assets/logo-polis.png")}
            style={styles.logo}
            resizeMode={"contain"}
          />
        </View>

        <Text style={styles.title}>Registro de Ponto</Text>
        <Text style={styles.subtitle}>
          Controle, transparencia e eficiencia
        </Text>
      </View>

      {/* CARD */}
      <View style={styles.card}>
        {/* QUICK LOGIN */}
        {savedUser && (
          <TouchableOpacity
            style={styles.quickUser}
            onPress={loginWithBiometrics}
          >
            <View style={styles.quickAvatar}>
              {savedUser.avatar ? (
                <Image
                  source={{ uri: savedUser.avatar }}
                  style={styles.quickImg}
                />
              ) : (
                <Text style={styles.quickInitial}>
                  {savedUser.name?.charAt(0) ?? "U"}
                </Text>
              )}
            </View>

            <Text style={styles.quickText}>
              Entrar como {savedUser.name ?? "usuario"}
            </Text>
            <Text style={styles.quickHint}>
              Toque para usar biometria
            </Text>
          </TouchableOpacity>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.label}>CPF</Text>
        <TextInput
          style={styles.input}
          placeholder={"000.000.000-00"}
          keyboardType={"numeric"}
          value={cpfMasked}
          onChangeText={(t) => {
            const { raw, formatted } = formatCpf(t);
            setCpfRaw(raw);
            setCpfMasked(formatted);
          }}
        />

        <Text style={styles.label}>Senha</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputControl}
            placeholder={"Sua senha"}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword((v) => !v)}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={styles.rememberRow}
            onPress={() => setRememberMe((v) => !v)}
          >
            <Ionicons
              name={rememberMe ? "checkbox" : "square-outline"}
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.rememberText}>Lembrar de mim</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              setDialog({
                type: "info",
                title: "Esqueci minha senha",
                message:
                  "Entre em contato com o RH ou administrador para redefinir sua senha.",
              })
            }
          >
            <Text style={styles.forgotText}>Esqueci minha senha</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={"#fff"} />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>
      </View>

      <AppDialog
        visible={!!dialog}
        type={dialog?.type || "info"}
        title={dialog?.title || ""}
        message={dialog?.message}
        onClose={() => setDialog(null)}
      />
    </KeyboardAvoidingView>
  );
}

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  header: {
    backgroundColor: Colors.primary,
    paddingTop: 80,
    paddingBottom: 64,
    alignItems: "center",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },

  logoBox: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 20,
    marginBottom: 20,

    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  logo: { height: 56 },

  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#c7d2fe", fontSize: 13, marginTop: 6 },

  card: {
    backgroundColor: Colors.card,
    margin: 16,
    marginTop: -48,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  quickUser: {
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },

  quickAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  quickImg: { width: 64, height: 64, borderRadius: 32 },
  quickInitial: { color: "#fff", fontSize: 24, fontWeight: "700" },

  quickText: { fontWeight: "700", color: Colors.text },
  quickHint: { fontSize: 12, color: Colors.textMuted },

  label: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  inputRow: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  inputControl: {
    flex: 1,
    paddingVertical: 12,
  },
  eyeButton: {
    paddingLeft: 6,
    paddingVertical: 6,
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rememberText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: "600",
  },
  forgotText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
  },

  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },

  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  error: { color: Colors.danger, textAlign: "center", marginBottom: 8 },
});

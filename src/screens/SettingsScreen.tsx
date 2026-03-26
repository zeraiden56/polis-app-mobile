// src/screens/SettingsScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Linking,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../hooks/useAuth";
import { Colors } from "../theme/colors";
import {
  requestNotificationPermission,
  scheduleShiftReminder,
  cancelShiftReminder,
} from "../services/notifications";

type Props = NativeStackScreenProps<RootStackParamList, "Config">;

const STORAGE_KEYS = {
  BIOMETRIA: "cfg_biometria",
  NOTIFICACOES: "cfg_notificacoes",
  NOTIF_OFFSET: "cfg_notif_offset",
};

/** URL da política de privacidade (obrigatória para lojas). Mesma URL informar na App Store e Play Console. */
const PRIVACY_POLICY_URL = "https://www.polistecnologia.com.br/politica-privacidade";

const OFFSETS = [5, 10, 15, 30];

export default function SettingsScreen({ navigation }: Props) {
  const { token } = useAuth();

  const [useBiometry, setUseBiometry] = useState(true);
  const [useNotifications, setUseNotifications] = useState(true);
  const [notifOffset, setNotifOffset] = useState(15);

  useEffect(() => {
    async function loadPrefs() {
      try {
        const [bio, notif, offset] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIA),
          AsyncStorage.getItem(STORAGE_KEYS.NOTIFICACOES),
          AsyncStorage.getItem(STORAGE_KEYS.NOTIF_OFFSET),
        ]);

        if (bio !== null) setUseBiometry(bio === "1");
        if (notif !== null) setUseNotifications(notif === "1");
        if (offset !== null) setNotifOffset(Number(offset));
      } catch (e) {
        if (__DEV__) console.log("Erro ao carregar configuracoes", e);
      }
    }

    loadPrefs();
  }, []);

  async function toggleBiometry(value: boolean) {
    setUseBiometry(value);
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.BIOMETRIA,
        value ? "1" : "0"
      );
    } catch (e) {
      if (__DEV__) console.log("Erro ao salvar biometria", e);
    }
  }

  async function toggleNotifications(value: boolean) {
    setUseNotifications(value);
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICACOES,
        value ? "1" : "0"
      );

      if (!token) return;

      if (value) {
        const ok = await requestNotificationPermission();
        if (!ok) {
          setUseNotifications(false);
          await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICACOES, "0");
          return;
        }

        await scheduleShiftReminder(token, notifOffset);
      } else {
        await cancelShiftReminder();
      }
    } catch (e) {
      if (__DEV__) console.log("Erro ao salvar notificacoes", e);
    }
  }

  async function changeOffset(value: number) {
    setNotifOffset(value);
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIF_OFFSET, String(value));

    if (useNotifications && token) {
      await scheduleShiftReminder(token, value);
    }
  }

  const version = Constants.expoConfig?.version ?? "--";

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Configuracoes</Text>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons name="home-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Seguranca</Text>

        <View style={styles.row}> 
          <View>
            <Text style={styles.label}>Biometria / Face ID</Text>
            <Text style={styles.subLabel}>
              Pedir autenticacao para abrir o app
            </Text>
          </View>

          <Switch value={useBiometry} onValueChange={toggleBiometry} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notificacoes</Text>

        <View style={styles.row}> 
          <View>
            <Text style={styles.label}>Lembretes de ponto</Text>
            <Text style={styles.subLabel}>
              Avisar antes do inicio do expediente
            </Text>
          </View>

          <Switch value={useNotifications} onValueChange={toggleNotifications} />
        </View>

        <Text style={styles.offsetTitle}>Antecedencia</Text>
        <View style={styles.offsetRow}>
          {OFFSETS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.offsetChip,
                notifOffset === m && styles.offsetChipActive,
              ]}
              onPress={() => changeOffset(m)}
            >
              <Text
                style={[
                  styles.offsetText,
                  notifOffset === m && styles.offsetTextActive,
                ]}
              >
                {m} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Justificativas</Text>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate("Justificativas")}
        >
          <Text style={styles.linkText}>Minhas justificativas</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sobre</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Versao</Text>
          <Text style={styles.valueText}>{version}</Text>
        </View>
        {PRIVACY_POLICY_URL ? (
          <TouchableOpacity
            style={[styles.linkRow, { marginTop: 12 }]}
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          >
            <Text style={styles.linkText}>Politica de privacidade</Text>
            <Ionicons name="open-outline" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 16,
    marginHorizontal: -16,
    marginBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  card: {
    backgroundColor: "#e1e6ff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#cfd8fb",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
  },
  subLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    maxWidth: 220,
  },
  offsetTitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 12,
    marginBottom: 6,
  },
  offsetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  offsetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#f8fafc",
  },
  offsetChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  offsetText: {
    fontSize: 12,
    color: Colors.text,
  },
  offsetTextActive: {
    color: "#ffffff",
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  linkText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  valueText: {
    fontSize: 14,
    color: Colors.text,
  },
});

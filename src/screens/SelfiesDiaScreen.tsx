// src/screens/SelfiesDiaScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
  PanResponder,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../hooks/useAuth";
import { apiEspelhoMes } from "../api/ponto";
import { Colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "SelfiesDia">;

type EspelhoDia = {
  data: string;
  entrada?: { hora: string; foto_url?: string };
  saida_almoco?: { hora: string; foto_url?: string };
  volta_almoco?: { hora: string; foto_url?: string };
  saida?: { hora: string; foto_url?: string };
};

function shiftDate(date: string, delta: number) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export default function SelfiesDiaScreen({ navigation, route }: Props) {
  const { token } = useAuth();

  const [currentDate, setCurrentDate] = useState(route.params.date);
  const [loading, setLoading] = useState(false);
  const [dia, setDia] = useState<EspelhoDia | null>(null);
  const [preview, setPreview] = useState<{ uri: string; hora: string } | null>(
    null
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20,
      onPanResponderRelease: (_, g) => {
        if (g.dx > 50) setCurrentDate((d) => shiftDate(d, -1));
        if (g.dx < -50) setCurrentDate((d) => shiftDate(d, 1));
      },
    })
  ).current;

  async function carregar() {
    if (!token) return;

    try {
      setLoading(true);
      const mes = currentDate.slice(0, 7);
      const { dias } = await apiEspelhoMes(token, mes);

      const d = dias.find((x: EspelhoDia) => x.data === currentDate) ?? null;
      setDia(d);
    } catch (e) {
      if (__DEV__) console.log("Erro ao carregar selfies", e);
      setDia(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [token, currentDate]);

  const fotos = [
    dia?.entrada,
    dia?.saida_almoco,
    dia?.volta_almoco,
    dia?.saida,
  ].filter((b) => b?.foto_url);

  const dataLabel = new Date(`${currentDate}T12:00:00`).toLocaleDateString(
    "pt-BR",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }
  );

  return (
    <View style={styles.screen} {...panResponder.panHandlers}>
      {/* HEADER */}
      <View style={styles.hero}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heroTitle}>Selfies do dia</Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons name="home-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* DATA */}
      <View style={styles.dateBar}>
        <TouchableOpacity
          style={styles.dateArrow}
          onPress={() => setCurrentDate((d) => shiftDate(d, -1))}
        >
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
        </TouchableOpacity>

        <Text style={styles.dateLabel}>{dataLabel}</Text>

        <TouchableOpacity
          style={styles.dateArrow}
          onPress={() => setCurrentDate((d) => shiftDate(d, 1))}
        >
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* CONTEÚDO */}
      <View style={styles.card}>
        {loading ? (
          <ActivityIndicator />
        ) : fotos.length === 0 ? (
          <Text style={styles.emptyText}>
            Nenhuma selfie registrada neste dia.
          </Text>
        ) : (
          <ScrollView contentContainerStyle={styles.grid}>
            {fotos.map((b, i) => (
              <TouchableOpacity
                key={i}
                style={styles.gridItem}
                onPress={() =>
                  b?.foto_url &&
                  setPreview({ uri: b.foto_url, hora: b.hora })
                }
              >
                <Image source={{ uri: b!.foto_url! }} style={styles.gridImage} />
                <Text style={styles.gridHour}>{b!.hora}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* MODAL */}
      <Modal visible={!!preview} transparent onRequestClose={() => setPreview(null)}>
        <View style={styles.previewContainer}>
          <TouchableOpacity
            style={styles.previewClose}
            onPress={() => setPreview(null)}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>

          {preview && (
            <>
              <Image
                source={{ uri: preview.uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
              <Text style={styles.previewHour}>Batida às {preview.hora}</Text>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  hero: {
    backgroundColor: Colors.primary,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  heroTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  dateBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 12,
    gap: 12,
  },
  dateArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },

  dateLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    textTransform: "capitalize",
  },

  card: {
    flex: 1,
    backgroundColor: "#e1e6ff",
    margin: 16,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "#cfd8fb",
  },

  emptyText: {
    textAlign: "center",
    marginTop: 24,
    color: Colors.textMuted,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  gridItem: {
    width: "48%",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#ffffff",
  },

  gridImage: { width: "100%", height: 150 },

  gridHour: {
    textAlign: "center",
    padding: 8,
    fontWeight: "600",
    color: Colors.text,
  },

  previewContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  previewClose: {
    position: "absolute",
    top: 48,
    right: 16,
    zIndex: 10,
  },

  previewImage: { width: "100%", height: "80%" },

  previewHour: {
    position: "absolute",
    bottom: 40,
    color: "#fff",
    fontSize: 14,
  },
});

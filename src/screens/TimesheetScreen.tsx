import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../hooks/useAuth";
import { apiEspelhoMes } from "../api/ponto";
import { Colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "FolhaPonto">;

type DiaEspelho = {
  data: string;
  entrada?: { hora: string };
  saida_almoco?: { hora: string };
  volta_almoco?: { hora: string };
  saida?: { hora: string };
  tempo_almoco?: string;
  carga_horaria?: string;
  status?: string;
};

function shiftMonth(ano: number, mes: number, delta: number) {
  const d = new Date(ano, mes + delta, 1);
  return { ano: d.getFullYear(), mes: d.getMonth() };
}

export default function TimesheetScreen({ navigation }: Props) {
  const { token } = useAuth();

  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth()); // 0–11

  const [dias, setDias] = useState<DiaEspelho[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const labelMesAno = useMemo(() => {
    return new Date(ano, mes, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }, [ano, mes]);

  /* =========================
     SWIPE ENTRE MESES
  ========================== */
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 40,
      onPanResponderRelease: (_, g) => {
        if (g.dx > 80) {
          const n = shiftMonth(ano, mes, -1);
          setAno(n.ano);
          setMes(n.mes);
        }
        if (g.dx < -80) {
          const n = shiftMonth(ano, mes, 1);
          setAno(n.ano);
          setMes(n.mes);
        }
      },
    })
  ).current;

  /* =========================
     LOAD MÊS
  ========================== */
  async function carregar() {
    if (!token) return;

    try {
      setErro(null);
      setLoading(true);

      const mesFmt = `${ano}-${String(mes + 1).padStart(2, "0")}`;
      const res = await apiEspelhoMes(token, mesFmt);

      setDias(Array.isArray(res?.dias) ? res.dias : []);
    } catch (e) {
      if (__DEV__) console.log("Erro ao carregar espelho mensal", e);
      setErro("Erro ao carregar dados do mês.");
      setDias([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [token, ano, mes]);

  return (
    <View style={styles.screen} {...panResponder.panHandlers}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Folha de ponto</Text>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons name="home-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* MÊS */}
      <View style={styles.monthBar}>
        <TouchableOpacity
          style={styles.monthArrow}
          onPress={() => {
            const n = shiftMonth(ano, mes, -1);
            setAno(n.ano);
            setMes(n.mes);
          }}
        >
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
        </TouchableOpacity>

        <Text style={styles.monthTitle}>{labelMesAno}</Text>

        <TouchableOpacity
          style={styles.monthArrow}
          onPress={() => {
            const n = shiftMonth(ano, mes, 1);
            setAno(n.ano);
            setMes(n.mes);
          }}
        >
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* CONTEÚDO */}
      <View style={styles.card}>
        {loading ? (
          <ActivityIndicator />
        ) : erro ? (
          <Text style={styles.error}>{erro}</Text>
        ) : (
          <ScrollView>
            {dias.map((d) => {
              const date = new Date(`${d.data}T12:00:00`);

              return (
                <TouchableOpacity
                  key={d.data}
                  style={styles.dayRow}
                  onPress={() =>
                    navigation.navigate("SelfiesDia", { date: d.data })
                  }
                >
                  <View style={styles.dayLeft}>
                    <Text style={styles.dayDate}>
                      {date.toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </Text>
                    <Text style={styles.dayWeek}>
                      {date.toLocaleDateString("pt-BR", {
                        weekday: "short",
                      })}
                    </Text>
                  </View>

                  <View style={styles.hours}>
                    <Hour label="Ent." value={d.entrada?.hora} />
                    <Hour label="S.Alm." value={d.saida_almoco?.hora} />
                    <Hour label="Volta" value={d.volta_almoco?.hora} />
                    <Hour label="Saída" value={d.saida?.hora} />
                  </View>

                  <Ionicons
                    name="images-outline"
                    size={18}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

/* =========================
   COMPONENTES
========================= */
function Hour({ label, value }: { label: string; value?: string }) {
  const empty = !value || value === "--:--";
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={styles.hourLabel}>{label}</Text>
      <Text
        style={[
          styles.hourValue,
          empty && { color: Colors.danger },
        ]}
      >
        {value ?? "--:--"}
      </Text>
    </View>
  );
}

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  header: {
    backgroundColor: Colors.primary,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  monthBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 12,
    gap: 12,
  },

  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },

  monthTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
    color: Colors.text,
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

  error: {
    textAlign: "center",
    color: Colors.danger,
  },

  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dbe2ff",
    backgroundColor: "#ffffff",
    marginBottom: 10,
  },

  dayLeft: {
    width: 56,
    alignItems: "center",
  },

  dayDate: {
    fontWeight: "700",
    color: Colors.text,
  },

  dayWeek: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "capitalize",
  },

  hours: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },

  hourLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },

  hourValue: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
  },
});

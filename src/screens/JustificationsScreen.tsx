import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../hooks/useAuth";
import { apiListJustificativas } from "../api/ponto";
import { Colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Justificativas">;

type Justificativa = {
  id: number;
  data_inicio?: string;
  data_fim?: string | null;
  tipo?: string;
  status?: string;
  motivo?: string | null;
  descricao?: string | null;
  anexos?: { id: number; file_url: string; original_name?: string }[];
};

function shiftMonth(ano: number, mes: number, delta: number) {
  const d = new Date(ano, mes + delta, 1);
  return { ano: d.getFullYear(), mes: d.getMonth() };
}

function statusLabel(status?: string) {
  switch ((status || "").toLowerCase()) {
    case "approved":
      return { label: "Aprovada", color: "#16a34a" };
    case "rejected":
      return { label: "Rejeitada", color: Colors.danger };
    case "pending":
      return { label: "Pendente", color: "#f59e0b" };
    default:
      return { label: status || "--", color: Colors.textMuted };
  }
}

export default function JustificationsScreen({ navigation }: Props) {
  const { token } = useAuth();

  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth()); // 0-11

  const [items, setItems] = useState<Justificativa[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const labelMesAno = useMemo(() => {
    return new Date(ano, mes, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }, [ano, mes]);

  async function carregar() {
    if (!token) return;

    try {
      setLoading(true);
      setErro(null);
      const mesFmt = `${ano}-${String(mes + 1).padStart(2, "0")}`;
      const data = await apiListJustificativas(token, mesFmt);
      setItems(data);
    } catch (e: any) {
      setItems([]);
      setErro(e?.message || "Erro ao carregar justificativas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [token, ano, mes]);

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Justificativas</Text>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons name="home-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* MES */}
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

      {/* LISTA */}
      <View style={styles.card}>
        {loading ? (
          <ActivityIndicator />
        ) : erro ? (
          <Text style={styles.error}>{erro}</Text>
        ) : items.length == 0 ? (
          <Text style={styles.empty}>Nenhuma justificativa neste mes.</Text>
        ) : (
          <ScrollView>
            {items.map((j) => {
              const st = statusLabel(j.status);
              const dataIni = j.data_inicio
                ? new Date(`${j.data_inicio}T12:00:00`).toLocaleDateString("pt-BR")
                : "--";
              const dataFim = j.data_fim
                ? new Date(`${j.data_fim}T12:00:00`).toLocaleDateString("pt-BR")
                : null;

              return (
                <View key={j.id} style={styles.item}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>{(j.tipo || "").toUpperCase()}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      { borderColor: st.color, backgroundColor: `${st.color}1A` },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>

                <Text style={styles.itemDate}>
                  {dataFim ? `${dataIni} ate ${dataFim}` : dataIni}
                </Text>

                {j.motivo ? <Text style={styles.itemDesc}>{j.motivo}</Text> : null}
                {j.descricao ? (
                  <Text style={styles.itemDesc}>{j.descricao}</Text>
                ) : null}

                {j.anexos && j.anexos.length > 0 ? (
                  <View style={styles.attachmentsRow}>
                    {j.anexos.map((a) => (
                      <TouchableOpacity
                        key={`${j.id}-${a.id}`}
                        style={styles.attachmentChip}
                        onPress={() => a.file_url && Linking.openURL(a.file_url)}
                      >
                        <Ionicons name="document-text-outline" size={14} color={Colors.primary} />
                        <Text style={styles.attachmentText} numberOfLines={1}>
                          {a.original_name || "Anexo"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

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

  empty: {
    textAlign: "center",
    color: Colors.textMuted,
    marginTop: 16,
  },

  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#dbe2ff",
  },

  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  itemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },

  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },

  itemDate: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textMuted,
  },

  itemDesc: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.text,
  },
  attachmentsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#eef2ff",
  },
  attachmentText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "600",
    maxWidth: 160,
  },
});

// src/screens/HomeScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  StatusBar,
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAuth } from "../hooks/useAuth";
import { apiRegistrarPonto, apiEspelhoHoje, apiAlocacaoAtual, RegistrarPayload } from "../api/ponto";
import { RootStackParamList } from "../navigation/AppNavigator";
import { Colors } from "../theme/colors";
import { enqueuePonto, flushQueue, getQueueCount } from "../services/pontoQueue";
import AppDialog from "../components/AppDialog";
import { toAbsoluteUrl } from "../api/config";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

type EspelhoDia = {
  entrada?: { hora: string };
  saida_almoco?: { hora: string };
  volta_almoco?: { hora: string };
  saida?: { hora: string };
  tempo_almoco?: string;
  carga_horaria?: string;
};

type AlocacaoAtual = {
  contrato?: { descricao?: string | null };
  local?: { descricao?: string | null; cidade?: string | null; uf?: string | null };
  cargo?: string | null;
  escala?: string | null;
  horarios?: {
    entrada_1?: string | null;
    saida_1?: string | null;
    entrada_2?: string | null;
    saida_2?: string | null;
  };
};

function isNetworkError(error: any): boolean {
  const msg = String(error?.message || "");
  return (
    msg.includes("Network request failed") ||
    msg.includes("Failed to fetch") ||
    msg.includes("timeout") ||
    msg.includes("Network")
  );
}

export default function HomeScreen({ navigation }: Props) {
  const { user, token, logout } = useAuth();

  const [loadingEspelho, setLoadingEspelho] = useState(false);
  const [loadingPonto, setLoadingPonto] = useState(false);
  const [espelho, setEspelho] = useState<EspelhoDia | null>(null);

  const [loadingAlocacao, setLoadingAlocacao] = useState(false);
  const [alocacao, setAlocacao] = useState<AlocacaoAtual | null>(null);
  const [alocacaoErro, setAlocacaoErro] = useState<string | null>(null);

  const [pendingCount, setPendingCount] = useState(0);

  const [dialog, setDialog] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message?: string;
  } | null>(null);

  const displayName =
    (user as any)?.name?.trim() ||
    (user as any)?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Usuario";

  const inicial = displayName.charAt(0).toUpperCase();
  const avatarRaw =
    (user as any)?.avatar_url ??
    (user as any)?.avatar ??
    null;
  const avatarUrl = avatarRaw ? toAbsoluteUrl(avatarRaw) : null;
  const avatarBusted =
    avatarUrl && avatarUrl.includes("?")
      ? `${avatarUrl}&t=${Date.now()}`
      : avatarUrl
      ? `${avatarUrl}?t=${Date.now()}`
      : null;

  const hoje = new Date();
  const hojeISO = hoje.toISOString().slice(0, 10);
  const dataHojeLabel = hoje.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  async function carregarEspelho() {
    if (!token) return;
    try {
      setLoadingEspelho(true);
      const dia = await apiEspelhoHoje(token);
      setEspelho(dia);
    } catch {
      setEspelho(null);
    } finally {
      setLoadingEspelho(false);
    }
  }

  async function carregarAlocacao() {
    if (!token) return;
    try {
      setLoadingAlocacao(true);
      setAlocacaoErro(null);
      const data = await apiAlocacaoAtual(token);
      setAlocacao(data ?? null);
    } catch (e: any) {
      setAlocacao(null);
      const msg = String(e?.message || "");
      if (msg.includes("404")) {
        setAlocacaoErro("Disponivel apos atualizacao do servidor.");
      } else {
        setAlocacaoErro(msg || "Sem alocacao ativa no momento.");
      }
    } finally {
      setLoadingAlocacao(false);
    }
  }

  async function refreshQueueCount() {
    const count = await getQueueCount();
    setPendingCount(count);
  }

  async function syncQueue() {
    if (!token) return;
    const res = await flushQueue(token);
    setPendingCount(res.pending);
    if (res.sent > 0) {
      setDialog({
        type: "success",
        title: "Batidas enviadas",
        message: `${res.sent} batida(s) foram enviadas com sucesso.`,
      });
    }
  }

  useEffect(() => {
    carregarEspelho();
    carregarAlocacao();
    refreshQueueCount();
    syncQueue();
  }, [token]);

  const horarioLabel = useMemo(() => {
    const h = alocacao?.horarios;
    if (!h) return null;

    const p1 = h.entrada_1 && h.saida_1 ? `${h.entrada_1}-${h.saida_1}` : null;
    const p2 = h.entrada_2 && h.saida_2 ? `${h.entrada_2}-${h.saida_2}` : null;

    return [p1, p2].filter(Boolean).join(" / ") || null;
  }, [alocacao]);

  async function handleBaterPonto() {
    if (!token) return;

    let payload: RegistrarPayload | null = null;

    try {
      setLoadingPonto(true);

      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (cam.status !== "granted") {
        setDialog({
          type: "info",
          title: "Permissao",
          message: "Camera necessaria para registrar o ponto.",
        });
        return;
      }

      const photo = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        quality: 0.7,
      });
      if (photo.canceled) return;

      const loc = await Location.requestForegroundPermissionsAsync();
      if (loc.status !== "granted") {
        setDialog({
          type: "info",
          title: "Permissao",
          message: "Localizacao necessaria para registrar o ponto.",
        });
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      payload = {
        fotoUri: photo.assets[0].uri,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? undefined,
      };

      await apiRegistrarPonto(token, payload as RegistrarPayload);

      setDialog({
        type: "success",
        title: "Ponto registrado",
        message: "Sua batida foi registrada com sucesso.",
      });
      carregarEspelho();
    } catch (e: any) {
      if (isNetworkError(e)) {
        if (payload) {
          await enqueuePonto(payload as RegistrarPayload);
        }
        await refreshQueueCount();
        setDialog({
          type: "info",
          title: "Sem internet",
          message: "Batida salva no aparelho e sera enviada quando a conexao voltar.",
        });
        return;
      }

      setDialog({
        type: "error",
        title: "Erro",
        message: e?.message || "Falha ao registrar ponto.",
      });
    } finally {
      setLoadingPonto(false);
    }
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.userBlock}>
              <TouchableOpacity onPress={() => navigation.navigate("Perfil")}>
                <View style={styles.avatar}>
                  {avatarBusted ? (
                    <Image
                      source={{ uri: avatarBusted }}
                      style={styles.avatarImg}
                    />
                  ) : (
                    <Text style={styles.avatarText}>{inicial}</Text>
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.userInfo}>
                <Text style={styles.hello}>Olá,</Text>
                <Text style={styles.name}>{displayName}</Text>
              </View>
            </View>

            <View style={styles.brandStack}>
              <View style={styles.brandBadge}>
                <Image
                  source={require("../../assets/logo-polis.png")}
                  style={styles.brandBadgeImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.iconPill}
                  onPress={() => navigation.navigate("Config")}
                >
                  <Ionicons name="settings-outline" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconPill}
                  onPress={logout}
                >
                  <Ionicons name="log-out-outline" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* HOJE */}
        <View style={styles.todayCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.todayTitle}>Hoje</Text>
            <Text style={styles.todayDate}>{dataHojeLabel}</Text>
          </View>

          {loadingEspelho ? (
            <ActivityIndicator />
          ) : (
            <View style={styles.batidasBox}>
              <BatidaRow label="Entrada" value={espelho?.entrada?.hora} />
              <BatidaRow label="Saida almoco" value={espelho?.saida_almoco?.hora} />
              <BatidaRow label="Volta almoco" value={espelho?.volta_almoco?.hora} />
              <BatidaRow label="Saida" value={espelho?.saida?.hora} />
            </View>
          )}

          <View style={styles.summaryRow}>
            <Summary label="Intervalo" value={espelho?.tempo_almoco} />
            <Summary label="Trabalhado" value={espelho?.carga_horaria} />
          </View>

          <View style={styles.extraInfo}>
            <InfoLine label="Horario" value={horarioLabel} />
            <InfoLine
              label="Local"
              value={
                alocacao?.local?.descricao
                  ? `${alocacao.local.descricao}${
                      alocacao.local.cidade
                        ? ` - ${alocacao.local.cidade}${
                            alocacao.local.uf ? `/${alocacao.local.uf}` : ""
                          }`
                        : ""
                    }`
                  : loadingAlocacao
                  ? "Carregando..."
                  : alocacaoErro ?? "--"
              }
            />
          </View>

          <TouchableOpacity
            style={styles.punchButton}
            onPress={handleBaterPonto}
            disabled={loadingPonto}
          >
            {loadingPonto ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.punchText}>Bater ponto agora</Text>
              </>
            )}
          </TouchableOpacity>

          {pendingCount > 0 && (
            <TouchableOpacity style={styles.pendingButton} onPress={syncQueue}>
              <Ionicons name="cloud-upload-outline" size={18} color={Colors.primary} />
              <Text style={styles.pendingText}>
                Enviar pendencias ({pendingCount})
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.actionsRow}>
            <ActionButton
              label="Justificar"
              icon="document-text-outline"
              onPress={() => navigation.navigate("JustificarBatida", { data: hojeISO })}
            />
            <ActionButton
              label="Selfies do dia"
              icon="images-outline"
              onPress={() => navigation.navigate("SelfiesDia", { date: hojeISO })}
            />
            <ActionButton
              label="Espelho do mes"
              icon="calendar-outline"
              onPress={() => navigation.navigate("FolhaPonto")}
            />
          </View>

          <View style={styles.cardAccent} />
        </View>
      </ScrollView>

      <AppDialog
        visible={!!dialog}
        type={dialog?.type || "info"}
        title={dialog?.title || ""}
        message={dialog?.message}
        onClose={() => setDialog(null)}
      />
    </>
  );
}

/* COMPONENTES */
function BatidaRow({ label, value }: { label: string; value?: string }) {
  const empty = !value || value === "--:--";
  return (
    <View style={styles.batidaRow}>
      <Text style={styles.batidaLabel}>{label}</Text>
      <Text style={[styles.batidaValue, empty && { color: Colors.danger }]}>
        {value ?? "--:--"}
      </Text>
    </View>
  );
}

function Summary({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value ?? "--:--"}</Text>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "--"}</Text>
    </View>
  );
}

function ActionButton({ label, icon, onPress }: any) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <Ionicons name={icon} size={18} color={Colors.primary} />
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

/* STYLES */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  header: {
    backgroundColor: Colors.primary,
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginTop: 6,
  },

  brandStack: {
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },

  brandBadge: {
    width: 88,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    padding: 6,
    overflow: "hidden",
  },

  brandBadgeImage: {
    width: "100%",
    height: "100%",
  },

  userBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 88,
    justifyContent: "center",
    gap: 10,
  },

  userInfo: {
    flex: 1,
  },

  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  avatarImg: { width: 72, height: 72, borderRadius: 36 },
  avatarText: { fontWeight: "700", color: Colors.primary, fontSize: 22 },

  hello: { color: "#c7d2fe", fontSize: 14 },
  name: { color: "#fff", fontSize: 22, fontWeight: "700" },

  todayCard: {
    backgroundColor: "#e1e6ff",
    margin: 16,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#cfd8fb",
  },

  cardHeader: {
    marginBottom: 12,
  },

  todayTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  todayDate: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },

  batidasBox: {
    backgroundColor: "#eef1ff",
    borderRadius: 16,
    padding: 12,
  },

  batidaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  batidaLabel: { color: Colors.textMuted, fontSize: 12 },
  batidaValue: { color: Colors.text, fontWeight: "700", fontSize: 14 },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },

  summaryBox: {
    flex: 1,
    backgroundColor: "#eef1ff",
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 4,
    alignItems: "center",
  },

  summaryLabel: { fontSize: 11, color: Colors.textMuted },
  summaryValue: { fontSize: 14, fontWeight: "700", color: Colors.text },

  extraInfo: {
    marginTop: 12,
  },

  infoLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },

  infoLabel: { fontSize: 12, color: Colors.textMuted },
  infoValue: { fontSize: 12, color: Colors.text, fontWeight: "600" },

  punchButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  punchText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  pendingButton: {
    marginTop: 10,
    backgroundColor: "#e7ecff",
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  pendingText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },

  actionsRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 8,
  },

  cardAccent: {
    height: 6,
    marginTop: 14,
    borderRadius: 999,
    backgroundColor: "#c7d3ff",
  },

  actionButton: {
    flexBasis: "48%",
    minWidth: "48%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: "#edf0ff",
  },

  actionText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
});

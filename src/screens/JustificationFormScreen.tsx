import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

import { RootStackParamList } from "../navigation/AppNavigator";
import { apiCriarJustificativa } from "../api/ponto";
import { useAuth } from "../hooks/useAuth";
import AppDialog from "../components/AppDialog";
import { Colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "JustificarBatida">;

type Anexo = {
  uri: string;
  name: string;
  type: string;
};

export default function JustificationFormScreen({ route, navigation }: Props) {
  const initialDate = route.params.data || new Date().toISOString().slice(0, 10);
  const { token, user } = useAuth();

  const [tipo, setTipo] = useState<string>("falta");
  const [descricao, setDescricao] = useState("");
  const [dataInicio, setDataInicio] = useState(initialDate);
  const [dataFim, setDataFim] = useState("");
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message?: string;
  } | null>(null);

  const MAX_FILE_MB = 10;
  const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

  function buildAttachmentName(originalName: string, mimeType?: string | null) {
    const rawId = String(
      (user as any)?.cpf_cnpj ??
        (user as any)?.cpf ??
        (user as any)?.id ??
        "user"
    );
    const idPart = rawId.replace(/\D/g, "") || "user";
    const datePart = String(dataInicio || "").replace(/\D/g, "") || "data";

    const nameLower = originalName.toLowerCase();
    const dot = nameLower.lastIndexOf(".");
    let ext = dot > -1 ? nameLower.slice(dot + 1) : "";
    if (!ext && mimeType) {
      const typeExt = mimeType.split("/")[1];
      if (typeExt) ext = typeExt.toLowerCase();
    }
    if (!ext) ext = "jpg";

    return `justificativa_${idPart}_${datePart}_${Date.now()}.${ext}`;
  }

  async function validateFileSize(uri: string, knownSize?: number | null) {
    let size = knownSize ?? null;
    if (!size) {
      try {
        const info = await FileSystem.getInfoAsync(uri, { size: true });
        size = info.size ?? null;
      } catch {
        size = null;
      }
    }

    if (size && size > MAX_FILE_BYTES) {
      setDialog({
        type: "info",
        title: "Arquivo grande",
        message: `O arquivo excede ${MAX_FILE_MB} MB. Escolha um menor.`,
      });
      return false;
    }

    return true;
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const ok = await validateFileSize(asset.uri, asset.fileSize);
      if (!ok) return;

      const name = buildAttachmentName(
        asset.fileName ?? `foto-${Date.now()}.jpg`,
        asset.mimeType
      );
      const type = asset.mimeType ?? "image/jpeg";

      setAnexos((prev) => [
        ...prev,
        { uri: asset.uri, name, type },
      ]);
    }
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;
    const file = result.assets[0];
    const ok = await validateFileSize(file.uri, file.size);
    if (!ok) return;

    const name = buildAttachmentName(file.name, file.mimeType);

    setAnexos((prev) => [
      ...prev,
      {
        uri: file.uri,
        name,
        type: file.mimeType ?? "application/octet-stream",
      },
    ]);
  }

  async function handleSalvar() {
    if (!token) {
      setDialog({ type: "error", title: "Sessao", message: "Faca login novamente para continuar." });
      return;
    }

    try {
      setLoading(true);

      const dataInicioTrim = dataInicio.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicioTrim)) {
        setDialog({
          type: "error",
          title: "Data invalida",
          message: "Use o formato AAAA-MM-DD para a data inicial.",
        });
        return;
      }

      const dataFimTrim = dataFim.trim();
      if (dataFimTrim && !/^\d{4}-\d{2}-\d{2}$/.test(dataFimTrim)) {
        setDialog({
          type: "error",
          title: "Data invalida",
          message: "Use o formato AAAA-MM-DD para o fim do periodo.",
        });
        return;
      }

      await apiCriarJustificativa(token, {
        data: dataInicioTrim,
        data_fim: dataFimTrim || undefined,
        tipo,
        descricao,
        anexos,
      });

      setDialog({ type: "success", title: "Tudo certo", message: "Justificativa enviada com sucesso." });
    } catch (e: any) {
      setDialog({ type: "error", title: "Erro", message: e?.message || "Falha ao enviar justificativa." });
    } finally {
      setLoading(false);
    }
  }

  const dataLabel = /^\d{4}-\d{2}-\d{2}$/.test(dataInicio)
    ? new Date(`${dataInicio}T12:00:00`).toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "Data invalida";

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Justificar batida</Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons name="home-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.dateLabel}>{dataLabel}</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Periodo</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Data inicial</Text>
            <TextInput
              style={styles.input}
              placeholder="AAAA-MM-DD"
              value={dataInicio}
              onChangeText={setDataInicio}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Data final (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="AAAA-MM-DD"
              value={dataFim}
              onChangeText={setDataFim}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tipo</Text>
          <View style={styles.tipoRow}>
            {["falta", "atraso", "feriado", "atestado"].map((opcao) => (
              <TouchableOpacity
                key={opcao}
                style={[
                  styles.tipoChip,
                  tipo === opcao && styles.tipoChipActive,
                ]}
                onPress={() => setTipo(opcao)}
              >
                <Text
                  style={[
                    styles.tipoChipText,
                    tipo === opcao && styles.tipoChipTextActive,
                  ]}
                >
                  {opcao.charAt(0).toUpperCase() + opcao.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Descricao</Text>
          <TextInput
            style={styles.inputMultiline}
            multiline
            placeholder="Explique o motivo..."
            value={descricao}
            onChangeText={setDescricao}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Anexos</Text>
          <View style={styles.attachRow}>
            <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
              <Ionicons name="image-outline" size={18} color={Colors.primary} />
              <Text style={styles.attachText}>Foto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.attachButton} onPress={pickDocument}>
              <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
              <Text style={styles.attachText}>PDF / arquivo</Text>
            </TouchableOpacity>
          </View>

          {anexos.length > 0 && (
            <View style={styles.fileList}>
              {anexos.map((a, i) => (
                <Text key={`${a.name}-${i}`} style={styles.fileName}>
                  {a.name}
                </Text>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && { opacity: 0.7 }]}
          onPress={handleSalvar}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Enviar justificativa</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <AppDialog
        visible={!!dialog}
        type={dialog?.type || "info"}
        title={dialog?.title || ""}
        message={dialog?.message}
        onClose={() => {
          setDialog(null);
          if (dialog?.type === "success") navigation.goBack();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  content: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  dateLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 12,
    textTransform: "capitalize",
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  inputMultiline: {
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    backgroundColor: "#ffffff",
    textAlignVertical: "top",
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    backgroundColor: "#ffffff",
  },
  tipoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tipoChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#f8fafc",
  },
  tipoChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tipoChipText: {
    fontSize: 12,
    color: Colors.text,
  },
  tipoChipTextActive: {
    color: "#ffffff",
  },
  attachRow: {
    flexDirection: "row",
    gap: 8,
  },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#eef2ff",
  },
  attachText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
  },
  fileList: {
    marginTop: 8,
  },
  fileName: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textMuted,
  },
  saveButton: {
    marginTop: 4,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
  },
});

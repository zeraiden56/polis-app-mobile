import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";

import { useAuth } from "../hooks/useAuth";
import { apiGetProfile, apiUploadAvatar } from "../api/profile";
import { Colors } from "../theme/colors";
import { toAbsoluteUrl } from "../api/config";

const placeholder = require("../../assets/avatar-placeholder.png");

type Profile = {
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
  matricula?: string;
  admissao?: string;
  horario?: string;
  avatar_url?: string | null;
};

export default function ProfileScreen() {
  const { token, setUserFromProfile } = useAuth();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  /* =========================
     LOAD PROFILE
  ========================== */
  async function carregar() {
    if (!token) return;

    try {
      setLoading(true);
      const data = await apiGetProfile(token);
      setProfile(data);
      setUserFromProfile(data as any);
    } catch (e) {
      if (__DEV__) console.log("Erro ao carregar perfil", e);
      Alert.alert("Erro", "Não foi possível carregar o perfil.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [token]);

  /* =========================
     CHANGE AVATAR
  ========================== */
  async function trocarFoto() {
    if (!token || uploading) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permissão", "Permita acesso às fotos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled) return;

    try {
      setUploading(true);

      const { avatar_url } = await apiUploadAvatar(
        token,
        result.assets[0].uri
      );

      setUserFromProfile({
        ...(profile as any),
        avatar_url: `${avatar_url}?t=${Date.now()}`,
      } as any);

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              avatar_url: `${avatar_url}?t=${Date.now()}`, // 🔥 quebra cache
            }
          : prev
      );

      setUserFromProfile({
        ...(profile as any),
        avatar_url: `${avatar_url}?t=${Date.now()}`,
      } as any);
    } catch (e) {
      if (__DEV__) console.log("Erro upload avatar", e);
      Alert.alert("Erro", "Falha ao enviar foto.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!profile) return null;

  const avatarUri = profile.avatar_url
    ? toAbsoluteUrl(profile.avatar_url)
    : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Meu perfil</Text>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons name="home-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* AVATAR */}
      <View style={styles.avatarSection}>
        <Image
          key={profile.avatar_url}
          source={avatarUri ? { uri: avatarUri } : placeholder}
          style={styles.avatar}
          contentFit="cover"
          cachePolicy="none"
          onError={(error) => {
            if (__DEV__) console.log("Erro ao carregar avatar:", error);
          }}
        />

        <TouchableOpacity
          style={styles.changePhotoBtn}
          onPress={trocarFoto}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={styles.changePhotoText}>Alterar foto</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.name}>{profile.name}</Text>
      </View>

      {/* INFO CARD */}
      <View style={styles.card}>
        <Info label="CPF" value={profile.cpf} />
        <Info label="Email" value={profile.email} />
        <Info label="Telefone" value={profile.phone} />
        <Info label="Matrícula" value={profile.matricula} />
        <Info label="Admissão" value={profile.admissao} />
        <Info label="Horário" value={profile.horario} />
      </View>
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "--"}</Text>
    </View>
  );
}

/* =========================
   STYLES
========================== */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* HEADER */
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 20,
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

  /* AVATAR */
  avatarSection: {
    alignItems: "center",
    marginTop: 20,
  },

  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: Colors.primary,
    backgroundColor: "#eee",
  },

  changePhotoBtn: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },

  changePhotoText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },

  name: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
    paddingHorizontal: 24,
  },

  /* CARD */
  card: {
    backgroundColor: "#e1e6ff",
    margin: 20,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#cfd8fb",
  },

  infoRow: {
    marginBottom: 16,
  },

  infoLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
});

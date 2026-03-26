import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiAlocacaoAtual } from "../api/ponto";
import { apiGetProfile } from "../api/profile";

const NOTIF_ID_KEY = "shift_notif_id";


async function getNotifications() {
  return await import("expo-notifications");
}

function isExpoGo() {
  return Constants.appOwnership === "expo";
}

function parseHorarioLabel(label?: string | null): { hour: number; minute: number } | null {
  if (!label) return null;
  const match = label.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function applyOffset(hour: number, minute: number, offsetMin: number) {
  let total = hour * 60 + minute - offsetMin;
  if (total < 0) total += 24 * 60;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return { hour: h, minute: m };
}

export async function requestNotificationPermission() {
  if (isExpoGo()) return false;
  const Notifications = await getNotifications();
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function cancelShiftReminder() {
  if (isExpoGo()) return;
  const Notifications = await getNotifications();
  const existingId = await AsyncStorage.getItem(NOTIF_ID_KEY);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId);
    await AsyncStorage.removeItem(NOTIF_ID_KEY);
  }
}

export async function scheduleShiftReminder(token: string, offsetMin = 15) {
  if (isExpoGo()) return;
  const Notifications = await getNotifications();

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("shift", {
      name: "Lembretes de ponto",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });
  }

  // resolve horario
  let hour = 8;
  let minute = 0;

  try {
    const alloc = await apiAlocacaoAtual(token);
    const h1 = alloc?.horarios?.entrada_1 || null;
    const parsed = parseHorarioLabel(h1 || alloc?.escala || null);
    if (parsed) {
      hour = parsed.hour;
      minute = parsed.minute;
    } else {
      const profile = await apiGetProfile(token);
      const parsedProfile = parseHorarioLabel(profile?.horario || null);
      if (parsedProfile) {
        hour = parsedProfile.hour;
        minute = parsedProfile.minute;
      }
    }
  } catch {
    // fallback default 08:00
  }

  const triggerTime = applyOffset(hour, minute, offsetMin);

  await cancelShiftReminder();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Polis Ponto",
      body: `Lembrete: faltam ${offsetMin} min para seu expediente.`,
      sound: "default",
    },
    trigger: {
      hour: triggerTime.hour,
      minute: triggerTime.minute,
      repeats: true,
      channelId: "shift",
    },
  });

  await AsyncStorage.setItem(NOTIF_ID_KEY, id);
}

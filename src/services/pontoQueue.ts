import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRegistrarPonto, RegistrarPayload } from "../api/ponto";

const QUEUE_KEY = "ponto_queue_v1";

type PendingPonto = {
  id: string;
  createdAt: string;
  payload: RegistrarPayload;
};

async function loadQueue(): Promise<PendingPonto[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveQueue(list: PendingPonto[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(list));
}

function isNetworkError(error: any): boolean {
  const msg = String(error?.message || "");
  return (
    msg.includes("Network request failed") ||
    msg.includes("Failed to fetch") ||
    msg.includes("timeout") ||
    msg.includes("Network")
  );
}

export async function enqueuePonto(payload: RegistrarPayload) {
  const list = await loadQueue();
  const item: PendingPonto = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    payload,
  };

  list.push(item);
  await saveQueue(list);
  return item;
}

export async function getQueueCount() {
  const list = await loadQueue();
  return list.length;
}

export async function flushQueue(token: string) {
  const list = await loadQueue();
  if (list.length == 0) return { sent: 0, pending: 0 };

  const remaining: PendingPonto[] = [];
  let sent = 0;

  for (const item of list) {
    try {
      await apiRegistrarPonto(token, item.payload);
      sent += 1;
    } catch (e) {
      if (isNetworkError(e)) {
        remaining.push(item);
        // stop on offline/network error
        const rest = list.slice(list.indexOf(item) + 1);
        remaining.push(...rest);
        break;
      }

      // erro de validacao/servidor: descarta a batida para nao travar a fila
    }
  }

  await saveQueue(remaining);
  return { sent, pending: remaining.length };
}

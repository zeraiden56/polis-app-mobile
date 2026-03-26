import { API_URL, toAbsoluteUrl } from "./config";

/* ==============================
   HANDLER PADRÃO
================================ */
async function handleResponse<T = any>(res: Response): Promise<T> {
  const text = await res.text();

  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    console.error("Resposta não é JSON:", text);
    throw new Error("Resposta inválida do servidor");
  }

  if (!res.ok) {
    throw new Error(data?.message || "Erro desconhecido");
  }

  return data;
}

/* ==============================
   TIPOS
================================ */
export type ProfileData = {
  id: number;
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
  matricula?: string;
  admissao?: string;
  horario?: string;
  avatar_url?: string | null;
};

/* ==============================
   API
================================ */
export async function apiGetProfile(token: string): Promise<ProfileData> {
  const res = await fetch(`${API_URL}/v1/ponto/profile`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const raw = await handleResponse<any>(res);

  if (!raw?.data) {
    console.error("Perfil inválido:", raw);
    throw new Error("Resposta inválida do servidor");
  }

  const data = raw.data;

  if (data?.avatar_url) {
    data.avatar_url = toAbsoluteUrl(data.avatar_url);
  }

  return data;
}

export async function apiUploadAvatar(
  token: string,
  uri: string
): Promise<{ avatar_url: string }> {
  const formData = new FormData();

  formData.append("foto", {
    uri,
    name: "avatar.jpg",
    type: "image/jpeg",
  } as any);

  const res = await fetch(`${API_URL}/v1/ponto/profile/avatar`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const text = await res.text();
  let raw: any = null;

  try {
    raw = text ? JSON.parse(text) : null;
  } catch {
    console.error("Resposta não-JSON:", text);
    throw new Error("Resposta inválida do servidor");
  }

  if (!res.ok) {
    console.error("Erro backend:", raw);
    throw new Error(raw?.message || "Erro ao enviar avatar");
  }

  // 🔑 EXTRAÇÃO ULTRA SEGURA
  const avatarUrl =
    raw?.data?.avatar_url ??
    raw?.avatar_url ??
    null;

  if (!avatarUrl) {
    console.error("avatar_url não encontrado:", raw);
    throw new Error("Servidor não retornou avatar_url");
  }

  return { avatar_url: toAbsoluteUrl(avatarUrl) as string };
}


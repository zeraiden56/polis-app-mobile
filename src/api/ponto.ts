import { API_URL, toAbsoluteUrl } from "./config";

/**
 * Trata resposta HTTP de forma defensiva
 */
async function handleResponse(res: Response) {
  const text = await res.text();
  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Erro HTTP ${res.status} - ${text}`);
    }
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || text || "Erro desconhecido";
    throw new Error(`Erro HTTP ${res.status} - ${msg}`);
  }

  return data;
}

export type RegistrarPayload = {
  fotoUri: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  observacao?: string;
};

/**
 * Registrar batida de ponto (API NOVA)
 * POST /api/v1/ponto/bater
 */
export async function apiRegistrarPonto(
  token: string,
  payload: RegistrarPayload
) {
  const formData = new FormData();

  formData.append("foto", {
    uri: payload.fotoUri,
    name: "selfie.jpg",
    type: "image/jpeg",
  } as any);

  if (payload.latitude != null)
    formData.append("latitude", String(payload.latitude));

  if (payload.longitude != null)
    formData.append("longitude", String(payload.longitude));

  if (payload.accuracy != null)
    formData.append("accuracy", String(payload.accuracy));

  if (payload.observacao)
    formData.append("observacao", payload.observacao);

  const res = await fetch(`${API_URL}/v1/ponto/bater`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const raw = await handleResponse(res);

  const ponto = raw?.data ?? null;
  if (ponto?.foto_url) {
    ponto.foto_url = toAbsoluteUrl(ponto.foto_url);
  }

  return raw;
}

/**
 * Histórico do dia atual (API NOVA)
 * GET /api/v1/ponto/hoje
 */
export async function apiHistoricoHoje(token: string) {
  const res = await fetch(`${API_URL}/v1/ponto/hoje`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const raw = await handleResponse(res);

  // 🔐 normalização defensiva
  let pontos: any[] = [];

  if (Array.isArray(raw?.data)) {
    pontos = raw.data;
  } else if (Array.isArray(raw?.pontos)) {
    pontos = raw.pontos;
  }

  pontos.forEach((p) => {
    if (p?.foto_url) {
      p.foto_url = toAbsoluteUrl(p.foto_url);
    }
  });

  return {
    ...raw,
    pontos,
  };
}

/**
 * Espelho mensal (API NOVA)
 * GET /api/v1/ponto/espelho?mes=YYYY-MM
 */
export async function apiEspelhoMes(token: string, mes: string) {
  const url = new URL(`${API_URL}/v1/ponto/espelho`);
  url.searchParams.set("mes", mes);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const raw = await handleResponse(res);

  // backend retorna { success, dias }
  const dias = Array.isArray(raw?.dias) ? raw.dias : [];

  dias.forEach((d: any) => {
    ["entrada", "saida_almoco", "volta_almoco", "saida"].forEach((k) => {
      if (d?.[k]?.foto_url) {
        d[k].foto_url = toAbsoluteUrl(d[k].foto_url);
      }
    });
  });

  return {
    ...raw,
    dias,
  };
}

export async function apiEspelhoHoje(token: string) {
  const url = new URL(`${API_URL}/v1/ponto/espelho`);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const raw = await handleResponse(res);

  const hoje = new Date().toISOString().slice(0, 10);

  const diaHoje = raw?.dias?.find((d: any) => d.data === hoje) ?? null;

  return diaHoje;
}

type AlocacaoAtual = {
  allocation_id?: number;
  timezone?: string;
  vigencia?: { inicio?: string | null; fim?: string | null };
  contrato?: {
    id?: number;
    descricao?: string | null;
    cliente?: string | null;
    empresa?: string | null;
  };
  local?: {
    descricao?: string | null;
    endereco?: string | null;
    cidade?: string | null;
    uf?: string | null;
  };
  cargo?: string | null;
  escala?: string | null;
  horarios?: {
    entrada_1?: string | null;
    saida_1?: string | null;
    entrada_2?: string | null;
    saida_2?: string | null;
  };
  work_days?: string[] | null;
};

export async function apiAlocacaoAtual(token: string): Promise<AlocacaoAtual | null> {
  const res = await fetch(`${API_URL}/v1/ponto/alocacao-atual`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const raw = await handleResponse(res);
  return raw?.data ?? null;
}

type AnexoPayload = {
  uri: string;
  name: string;
  type: string;
};

export async function apiCriarJustificativa(
  token: string,
  payload: {
    data: string;
    data_fim?: string;
    tipo: string;
    descricao?: string;
    motivo?: string;
    anexos?: AnexoPayload[];
  }
) {
  const formData = new FormData();

  formData.append("data_inicio", payload.data);
  if (payload.data_fim) formData.append("data_fim", payload.data_fim);
  formData.append("tipo", payload.tipo);
  formData.append("efeito", "justificar");

  if (payload.descricao) formData.append("descricao", payload.descricao);
  if (payload.motivo) formData.append("motivo", payload.motivo);

  (payload.anexos ?? []).forEach((file) => {
    formData.append("anexos[]", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
  });

  const res = await fetch(`${API_URL}/v1/ponto/eventos`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return handleResponse(res);
}

type Justificativa = {
  id: number;
  data_inicio?: string;
  data_fim?: string | null;
  tipo?: string;
  efeito?: string;
  status?: string;
  motivo?: string | null;
  descricao?: string | null;
  anexos?: { id: number; file_url: string; original_name: string }[];
};

export async function apiListJustificativas(
  token: string,
  mes: string
): Promise<Justificativa[]> {
  const url = new URL(`${API_URL}/v1/ponto/eventos`);
  url.searchParams.set("mes", mes);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const raw = await handleResponse(res);
  const items: Justificativa[] = Array.isArray(raw?.data) ? raw.data : [];

  items.forEach((j: any) => {
    if (Array.isArray(j?.anexos)) {
      j.anexos = j.anexos.map((a: any) => ({
        ...a,
        file_url: a?.file_url ? toAbsoluteUrl(a.file_url) : a?.file_url,
      }));
    }
  });

  return items;
}

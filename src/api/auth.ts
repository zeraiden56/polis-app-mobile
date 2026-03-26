// src/api/auth.ts
import { API_URL } from "./config";

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

/**
 * Login do funcionário
 * POST /api/auth/employee/login
 */
export async function apiLogin(document: string, password?: string) {
  const cpf = (document || "").replace(/\D/g, "");

  const res = await fetch(`${API_URL}/auth/employee/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cpf_cnpj: cpf,
      password,
    }),
  });

  const raw = await handleResponse(res);

  const employee = raw?.employee ?? raw?.user ?? raw?.data ?? null;

  return {
    success: raw?.success ?? true,
    message: raw?.message ?? null,
    token: raw?.token ?? raw?.access_token ?? null,

    // padrão esperado pelo AuthContext
    employee,
    user: employee,

    raw,
  };
}

/**
 * Alias usado pelo AuthContext
 */
export const apiEmployeeLogin = apiLogin;

/**
 * Retorna o employee autenticado
 * GET /api/v1/me
 */
export async function apiMe(token: string) {
  const res = await fetch(`${API_URL}/v1/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const raw = await handleResponse(res);

  // backend retorna o employee direto
  return raw;
}

/**
 * Troca de senha do funcionario
 * POST /api/auth/employee/change-password
 */
export async function apiChangePassword(
  token: string,
  payload: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }
) {
  const res = await fetch(`${API_URL}/auth/employee/change-password`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
}

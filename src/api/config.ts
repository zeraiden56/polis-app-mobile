/**
 * URL da API.
 * Teste: grupomgparticipacoes.com.br/api (fallback e .env local).
 * Produção: mgtparticipacoes.com.br/api — definir EXPO_PUBLIC_API_URL no build (EAS production / CI).
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://grupomgparticipacoes.com.br/api";

/**
 * Base sem /api no final
 * Usada para montar URLs absolutas de imagens (foto_url)
 */
export const BASE_URL = API_URL.replace(/\/api\/?$/, "");

export function toAbsoluteUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) return null;

  // já é absoluta
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${BASE_URL}${path}`;
}

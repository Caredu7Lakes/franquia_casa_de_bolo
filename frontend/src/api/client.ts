import axios from 'axios';
import { getToken, clearToken } from '../auth/auth';

// Mesmo domínio em produção (Caddy faz o proxy da API). Em dev, o proxy do Vite
// cuida disso; VITE_API_URL permite sobrescrever a base, se necessário.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearToken();
      if (!location.hash.startsWith('#/login')) {
        location.hash = '#/login';
      }
    }
    return Promise.reject(error);
  },
);

export function apiError(error: unknown, fallback = 'Ocorreu um erro.'): string {
  const e = error as { response?: { data?: { message?: string | string[] } } };
  const msg = e?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg || fallback;
}

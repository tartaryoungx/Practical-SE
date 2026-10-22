import { ApiError, type Api } from "./api-contract";
import type { Garment, Session } from "./types";

function apiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
}

function csrfToken() {
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function request<T>(path: string, init: RequestInit = {}, json = true): Promise<T> {
  const headers = new Headers(init.headers);
  const method = (init.method || "GET").toUpperCase();
  if (json && init.body) headers.set("Content-Type", "application/json");
  if (method !== "GET" && method !== "HEAD") headers.set("X-CSRF-Token", csrfToken());
  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError("NETWORK", "The server could not be reached.");
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = payload?.error ?? {};
    const fields: Record<string, string> = {};
    for (const detail of error.details ?? []) {
      if (detail?.field) fields[detail.field] = detail.message;
    }
    throw new ApiError(error.code || "HTTP_ERROR", error.message || "The request failed.", fields);
  }
  return payload as T;
}

function httpApi(): Api {
  return {
    async session() {
      try {
        return await request<Session>("/auth/session");
      } catch (error) {
        if (error instanceof ApiError && error.code === "UNAUTHENTICATED") return null;
        throw error;
      }
    },
    login: (email, password) =>
      request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    logout: () => request("/auth/logout", { method: "POST" }),
    changePassword: (current, password) =>
      request("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current, password }),
      }),
    resetPassword: (token, password) =>
      request("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      }),
    users: () => request("/users"),
    createUser: (input) => request("/users", { method: "POST", body: JSON.stringify(input) }),
    editUser: (id, input) =>
      request(`/users/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    setStatus: (id, active) =>
      request(`/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: active }),
      }),
    setRole: (id, role) =>
      request(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
    async adminReset(id, password) {
      const result = await request<{ temporary_password: string | null }>(
        `/users/${id}/reset-password`,
        { method: "POST", body: JSON.stringify({ password: password || null }) },
      );
      return result.temporary_password;
    },
    async issueReset(id) {
      const result = await request<{ token: string }>(`/users/${id}/reset-link`, {
        method: "POST",
      });
      return result.token;
    },
    grants: () => request("/roles/permissions"),
    saveGrants: (role, keys) =>
      request(`/roles/${role}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissions: keys }),
      }),
    garments: () => request("/garments"),
    garment: (id) => request(`/garments/${id}`),
    createGarment: (input) =>
      request("/garments", { method: "POST", body: JSON.stringify(input) }),
    assess: (id, condition) =>
      request(`/garments/${id}/condition`, {
        method: "PATCH",
        body: JSON.stringify({ condition }),
      }),
    upload: (id, file) => {
      const body = new FormData();
      body.append("file", file);
      return request<Garment>(`/garments/${id}/evidence`, { method: "POST", body }, false);
    },
    async evidenceUrl(garmentId, evidenceId) {
      const response = await fetch(
        `${apiBase()}/garments/${garmentId}/evidence/${evidenceId}`,
        { credentials: "include" },
      );
      if (!response.ok) throw new ApiError("NOT_FOUND", "The evidence file could not be opened.");
      return URL.createObjectURL(await response.blob());
    },
    confirm: (id, route, note) =>
      request(`/garments/${id}/confirm-route`, {
        method: "POST",
        body: JSON.stringify({ route, note }),
      }),
  };
}

let instance: Api;
export function getApi(): Api {
  if (!instance) instance = httpApi();
  return instance;
}

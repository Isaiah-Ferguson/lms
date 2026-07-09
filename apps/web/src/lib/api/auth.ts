import type { LoginRequest, CreateUserRequest, ChangePasswordRequest } from "@/types";
import { ApiError, apiFetch } from "./core";

// ─── Auth API ─────────────────────────────────────────────────────────────────

export interface LoginResult {
  expiresIn: number;
  mustChangePassword: boolean;
  role: string | null;
}

export const authApi = {
  // Login goes to the Next.js route handler (not the proxy) so it can set the
  // httpOnly session cookie on this origin.
  async login(body: LoginRequest): Promise<LoginResult> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let errBody: { title?: string; detail?: string; errors?: string[] } = {};
      try {
        errBody = await res.json();
      } catch {
        // ignore parse errors
      }
      throw new ApiError(
        res.status,
        errBody.title ?? "Error",
        errBody.detail ?? res.statusText,
        errBody.errors
      );
    }

    return res.json() as Promise<LoginResult>;
  },


  createUser(body: CreateUserRequest, token: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/api/auth/users", {
      method: "POST",
      body: JSON.stringify(body),
    }, token);
  },

  changePassword(body: ChangePasswordRequest, token: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(body),
    }, token);
  },

  forgotPassword(email: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
};

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const API_BASE = "/api";
const TOKEN_KEY = "frege_auth_token";

export interface AuthFarmer {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  state: string;
  lga?: string;
  farmingType?: string;
  neuroScore: number;
  communityReputation?: string;
  avatarUrl?: string | null;
  onboardingComplete: boolean;
}

interface OnboardingData {
  state: string;
  lga: string;
  farmingType: string;
  farmName?: string;
  farmSizeHa?: number;
}

interface AuthContextValue {
  farmer: AuthFarmer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<{ resetCode: string; note: string }>;
  resetPassword: (email: string, resetCode: string, password: string) => Promise<void>;
  sendPhoneOtp: (phone: string) => Promise<{ otp: string; isNewUser: boolean; note: string }>;
  verifyPhoneOtp: (phone: string, otp: string, name?: string) => Promise<{ isNewUser: boolean }>;
  saveOnboarding: (data: OnboardingData) => Promise<void>;
  updateFarmer: (updates: Partial<AuthFarmer>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [farmer, setFarmer] = useState<AuthFarmer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setIsLoading(false); return; }
    apiFetch("/auth/me")
      .then((data) => setFarmer(data))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    localStorage.setItem(TOKEN_KEY, data.token);
    setFarmer(data.farmer);
  }, []);

  const register = useCallback(async (name: string, email: string, phone: string, password: string) => {
    const data = await apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ name, email, phone, password }) });
    localStorage.setItem(TOKEN_KEY, data.token);
    setFarmer(data.farmer);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setFarmer(null);
    apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    return apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
  }, []);

  const resetPassword = useCallback(async (email: string, resetCode: string, password: string) => {
    const data = await apiFetch("/auth/reset-password", { method: "POST", body: JSON.stringify({ email, resetCode, password }) });
    localStorage.setItem(TOKEN_KEY, data.token);
    setFarmer(data.farmer);
  }, []);

  const sendPhoneOtp = useCallback(async (phone: string) => {
    return apiFetch("/auth/phone/send-otp", { method: "POST", body: JSON.stringify({ phone }) });
  }, []);

  const verifyPhoneOtp = useCallback(async (phone: string, otp: string, name?: string) => {
    const data = await apiFetch("/auth/phone/verify-otp", { method: "POST", body: JSON.stringify({ phone, otp, name }) });
    localStorage.setItem(TOKEN_KEY, data.token);
    setFarmer(data.farmer);
    return { isNewUser: data.isNewUser };
  }, []);

  const saveOnboarding = useCallback(async (data: OnboardingData) => {
    await apiFetch("/farmer/profile", {
      method: "PATCH",
      body: JSON.stringify({
        state: data.state,
        lga: data.lga,
        farmingType: data.farmingType,
        onboardingComplete: true,
      }),
    });
    if (data.farmName) {
      await apiFetch("/farms", {
        method: "POST",
        body: JSON.stringify({
          name: data.farmName,
          sizeHectares: data.farmSizeHa ?? 1,
          state: data.state,
          lga: data.lga,
          farmType: data.farmingType,
        }),
      });
    }
    setFarmer((prev) =>
      prev
        ? { ...prev, state: data.state, lga: data.lga, farmingType: data.farmingType, onboardingComplete: true }
        : null
    );
  }, []);

  const updateFarmer = useCallback((updates: Partial<AuthFarmer>) => {
    setFarmer((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        farmer, isAuthenticated: !!farmer, isLoading,
        login, register, logout, forgotPassword, resetPassword,
        sendPhoneOtp, verifyPhoneOtp, saveOnboarding, updateFarmer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

import React, { createContext, useEffect, useState, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiEmployeeLogin, apiMe } from "../api/auth";
import { toAbsoluteUrl } from "../api/config";

export type AuthUser = {
  id: number;
  nome: string;
  cpf_cnpj?: string;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  must_change_password?: boolean;
  [key: string]: any;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  mustChangePassword: boolean;

  login: (document: string, password: string, remember?: boolean) => Promise<boolean>;
  biometricLogin: () => Promise<boolean>;
  logout: () => Promise<void>;
  setUserFromProfile: (user: AuthUser) => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";
const BIOMETRIA_KEY = "cfg_biometria";

function normalizeEmployee(emp: any): AuthUser {
  const base = emp ?? {};
  const avatar = base.avatar_url ? toAbsoluteUrl(base.avatar_url) : null;
  const nome = base.nome ?? base.name;

  return {
    ...base,
    id: base.id,
    nome,
    name: nome,
    cpf_cnpj: base.cpf_cnpj ?? base.cpf,
    email: base.email ?? null,
    phone: base.phone ?? null,
    avatar_url: avatar,
    must_change_password: base.must_change_password ?? false,
  };
}

async function saveQuickUser(user: AuthUser) {
  if (user.cpf_cnpj) {
    await SecureStore.setItemAsync("cpf", user.cpf_cnpj);
  }

  const displayName = user.nome ?? user.name;
  if (displayName) {
    await SecureStore.setItemAsync("name", displayName);
  }

  if (user.avatar_url) {
    await SecureStore.setItemAsync("avatar_url", user.avatar_url);
  } else {
    await SecureStore.deleteItemAsync("avatar_url");
  }
}

async function clearQuickUser() {
  await SecureStore.deleteItemAsync("cpf");
  await SecureStore.deleteItemAsync("name");
  await SecureStore.deleteItemAsync("avatar_url");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const mustChangePassword = !!user?.must_change_password;

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedUser = await SecureStore.getItemAsync(USER_KEY);

        if (storedToken && storedUser) {
          const useBiometry = await AsyncStorage.getItem(BIOMETRIA_KEY);

          if (useBiometry === "1") {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            if (!hasHardware || !enrolled) {
              await logout();
              return;
            }

            const result = await LocalAuthentication.authenticateAsync({
              promptMessage: "Confirme sua identidade",
            });

            if (!result.success) {
              await logout();
              return;
            }
          }

          const parsedUser: AuthUser = normalizeEmployee(
            JSON.parse(storedUser)
          );

          setToken(storedToken);
          setUser(parsedUser);

          apiMe(storedToken)
            .then((fresh: AuthUser) => {
              const normalized = normalizeEmployee(fresh);
              setUser(normalized);
              SecureStore.setItemAsync(
                USER_KEY,
                JSON.stringify(normalized)
              ).catch(() => {});
              saveQuickUser(normalized).catch(() => {});
            })
            .catch(async () => {
              setUser(null);
              setToken(null);
              await SecureStore.deleteItemAsync(TOKEN_KEY);
              await SecureStore.deleteItemAsync(USER_KEY);
            });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (
    document: string,
    password: string,
    remember: boolean = true
  ) => {
    try {
      const data = await apiEmployeeLogin(document, password);

      const newToken: string = data.token;
      const emp = data.employee;

      const newUser: AuthUser = normalizeEmployee(emp);

      setToken(newToken);
      setUser(newUser);

      if (remember) {
        await SecureStore.setItemAsync(TOKEN_KEY, newToken);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser));
        await saveQuickUser(newUser);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
        await clearQuickUser();
      }

      return true;
    } catch (e) {
      if (__DEV__) console.log("[Auth] Erro ao fazer login", e);
      await logout();
      return false;
    }
  };

  const biometricLogin = async () => {
    try {
      const savedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!savedToken) return false;

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) return false;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirme sua identidade",
      });

      if (!result.success) return false;

      const freshUser = normalizeEmployee(await apiMe(savedToken));

      setToken(savedToken);
      setUser(freshUser);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(freshUser));
      await saveQuickUser(freshUser);

      return true;
    } catch (e) {
      if (__DEV__) console.log("[Auth] Erro no login biometrico", e);
      return false;
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  };

  const setUserFromProfile = (updated: AuthUser) => {
    const normalized = normalizeEmployee(updated);
    setUser(normalized);
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(normalized)).catch(() => {});
    saveQuickUser(normalized).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        mustChangePassword,
        login,
        biometricLogin,
        logout,
        setUserFromProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

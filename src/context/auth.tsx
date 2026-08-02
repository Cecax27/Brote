import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase/client";
import { checkNotificationPermissions } from "@/lib/notifications";

function translateError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("Invalid login credentials")) {
      return "Revisa tu correo y contraseña e inténtalo de nuevo.";
    }
    if (msg.includes("User already registered")) {
      return "Ya existe una cuenta con este correo. ¿Quieres iniciar sesión?";
    }
    if (msg.includes("Password should be at least 6 characters")) {
      return "La contraseña debe tener al menos 6 caracteres.";
    }
    if (msg.includes("rate limit")) {
      return "Has hecho muchas peticiones. Inténtalo de nuevo en unos minutos.";
    }
    if (msg.includes("Email not confirmed")) {
      return "Necesitas confirmar tu correo antes de entrar.";
    }
  }
  return "Algo salió mal. Inténtalo de nuevo.";
}

type NotificationPermissions = "undetermined" | "granted" | "denied";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  notificationPermission: NotificationPermissions;
  refreshNotificationPermission: () => Promise<void>;
  signIn: (params: { email: string; password: string }) => Promise<void>;
  signUp: (params: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissions>("undetermined");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshNotificationPermission = useCallback(async () => {
    if (Platform.OS === "web") {
      setNotificationPermission("denied");
      return;
    }
    try {
      const granted = await checkNotificationPermissions();
      setNotificationPermission(granted ? "granted" : "denied");
    } catch {
      setNotificationPermission("denied");
    }
  }, []);

  useEffect(() => {
    if (session) {
      refreshNotificationPermission();
    }
  }, [session, refreshNotificationPermission]);

  const signIn = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(translateError(error));
    },
    [],
  );

  const signUp = useCallback(
    async ({
      email,
      password,
      displayName,
    }: {
      email: string;
      password: string;
      displayName: string;
    }) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) throw new Error(translateError(error));
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      await supabase.from("push_tokens").delete().eq("user_id", user?.id);
    } catch {
      // Best effort cleanup
    }
    const { error } = await supabase.auth.signOut();
    setNotificationPermission("undetermined");
    if (error) throw new Error(translateError(error));
  }, [user]);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "brote://reset-password",
    });
    if (error) throw new Error(translateError(error));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isLoading,
        notificationPermission,
        refreshNotificationPermission,
        signIn,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

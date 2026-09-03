import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  Session,
} from "@supabase/supabase-js";

import {
  AuthContext,
  type AuthContextValue,
} from "./authContext";

import {
  supabase,
  supabaseConfigurationError,
} from "../services/supabase";

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] =
    useState<Session | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    if (supabaseConfigurationError) {
      queueMicrotask(() => {
        setLoading(false);
      });

      return;
    }

    const {
      data: {
        subscription,
      },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setLoading(false);
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      configurationError:
        supabaseConfigurationError,
      signIn: async (email, password) => {
        if (supabaseConfigurationError) {
          return supabaseConfigurationError;
        }

        const { error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        return error
          ? "Invalid email or password."
          : null;
      },
      signOut: async () => {
        await supabase.auth.signOut({
          scope: "local",
        });
      },
    }),
    [
      loading,
      session,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

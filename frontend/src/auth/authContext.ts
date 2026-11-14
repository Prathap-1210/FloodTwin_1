import {
  createContext,
} from "react";

import type {
  Session,
  User,
} from "@supabase/supabase-js";

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configurationError: string | null;
  signIn: (
    email: string,
    password: string,
  ) => Promise<string | null>;
  signOut: () => Promise<void>;
};

export const AuthContext =
  createContext<AuthContextValue | null>(null);

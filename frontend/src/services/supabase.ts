import {
  createClient,
} from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

export const supabaseConfigurationError =
  !supabaseUrl || !supabasePublishableKey
    ? "Supabase login is not configured for this build."
    : null;

export const supabase = createClient(
  supabaseUrl || "https://invalid.supabase.co",
  supabasePublishableKey || "invalid-publishable-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

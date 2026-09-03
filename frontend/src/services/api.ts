import axios, {
  AxiosError,
} from "axios";

import {
  supabase,
} from "./supabase";

export const DATA_MODE =
  import.meta.env.VITE_DATA_MODE ?? "live";

const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

// Keep browser requests same-origin during local Vite development. Vite then
// forwards /api to Render, avoiding cross-origin restrictions on dev ports.
const rawApiBaseUrl = import.meta.env.DEV
  ? "/api"
  : configuredApiBaseUrl;

export const API_BASE_URL = (
  rawApiBaseUrl || "https://floodtwin-api.onrender.com/api"
).replace(/\/+$/, "");

const PLACEHOLDER_HOSTS = [
  "YOUR-ACTUAL-SERVICE",
  "YOUR-REAL-SERVICE",
  "floodtwin-api-ab12",
  "floodtwin-api-7xyz",
];

export function getApiConfigurationError() {
  if (
    PLACEHOLDER_HOSTS.some((placeholder) =>
      API_BASE_URL.toLowerCase().includes(
        placeholder.toLowerCase(),
      ),
    )
  ) {
    return (
      "The app contains an example API address. " +
      "Copy the real onrender.com URL from the Render service dashboard."
    );
  }

  if (
    !API_BASE_URL.startsWith("/") &&
    !/^https?:\/\//i.test(API_BASE_URL)
  ) {
    return (
      "VITE_API_BASE_URL must be a complete http(s) URL " +
      "or a root-relative API path."
    );
  }

  return null;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  // Render free services can need longer than ten seconds to wake up.
  timeout: 45_000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const configurationError = getApiConfigurationError();

  if (configurationError) {
    return Promise.reject(new Error(configurationError));
  }

  const {
    data: {
      session,
    },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization =
      `Bearer ${session.access_token}`;
  }

  return config;
});

export function getApiErrorMessage(
  error: unknown,
  action: string,
) {
  const configurationError = getApiConfigurationError();

  if (configurationError) {
    return configurationError;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      detail?: string;
    }>;

    if (axiosError.code === "ECONNABORTED") {
      return `${action}: the cloud API timed out. Tap refresh after the Render service wakes up.`;
    }

    if (!axiosError.response) {
      return `${action}: cannot reach ${API_BASE_URL}. Check the deployed URL and internet connection.`;
    }

    const detail = axiosError.response.data?.detail;
    return `${action}: API returned ${axiosError.response.status}${
      detail ? ` (${detail})` : ""
    }.`;
  }

  if (error instanceof Error && error.message) {
    return `${action}: ${error.message}`;
  }

  return `${action}: unexpected connection error.`;
}

export async function checkApiHealth() {
  const response = await api.get<{
    status: string;
    database?: string;
  }>("/health");

  return response.data;
}

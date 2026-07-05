import axios from "axios";

const STORAGE_KEY = "ai_server_token";

type StoredToken = {
  token: string;
  expiresAt: number; // epoch ms
};

function readStoredToken(): StoredToken | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredToken;
  } catch {
    return null;
  }
}

function writeStoredToken(token: string, expiresInSeconds: number): void {
  if (typeof window === "undefined") return;
  // Shave a few seconds off the server-issued TTL so a request never starts
  // against a token that expires mid-flight.
  const stored: StoredToken = {
    token,
    expiresAt: Date.now() + expiresInSeconds * 1000 - 10_000,
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export function clearStoredAiServerToken(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

function getValidStoredToken(): string | null {
  const stored = readStoredToken();
  if (!stored || stored.expiresAt <= Date.now()) return null;
  return stored.token;
}

let inFlightFetch: Promise<string> | null = null;

async function fetchNewToken(): Promise<string> {
  // Goes through api-server (via the Next.js proxy), which re-validates the
  // candidate's existing Supabase session cookie before minting this token.
  const { data } = await axios.post<{ access_token: string; expires_in: number }>(
    "/api/ai-server/token",
    {},
  );
  writeStoredToken(data.access_token, data.expires_in);
  return data.access_token;
}

// Returns a valid ai-server token, fetching a fresh one if none is cached,
// expired, or forceRefresh is requested. Concurrent callers share one
// in-flight fetch instead of each minting their own token.
export async function getAiServerToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cached = getValidStoredToken();
    if (cached) return cached;
  }

  if (!inFlightFetch) {
    inFlightFetch = fetchNewToken().finally(() => {
      inFlightFetch = null;
    });
  }

  return inFlightFetch;
}

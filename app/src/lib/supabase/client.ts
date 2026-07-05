import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client used only to drive the OAuth handshake.
 *
 * The app authenticates against our own backend via httpOnly cookies, so this
 * client uses the PKCE flow and does NOT auto-detect / persist the session from
 * the URL — the /auth/callback page exchanges the code explicitly and hands the
 * resulting tokens to the backend.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set"
    );
  }

  return createBrowserClient(url, anonKey, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      persistSession: true,
      // Set autoRefreshToken to false to prevent browser from refreshing token
      // Let's server handle it
      // autoRefreshToken: false,
    },
  });
}

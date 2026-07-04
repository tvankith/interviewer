"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrainCircuit } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * OAuth return page (frontend-initiated flow).
 *
 * Supabase redirects here with a PKCE `code`. We exchange it for a session
 * client-side, hand the tokens to our Next.js API route (which validates them
 * against the backend and sets httpOnly cookies), then clear the local Supabase
 * session so the backend cookies are the single source of truth.
 */
function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const supabase = createSupabaseBrowserClient();

      try {
        const code = params.get("code");
        if (!code) {
          throw new Error("Missing authorization code");
        }

        const { data, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError || !data.session) {
          throw new Error(exchangeError?.message || "Failed to complete sign in");
        }

        const res = await fetch("/api/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Authentication failed");
        }

        // httpOnly cookies set by the API route are now the source of truth.
        await supabase.auth.signOut();

        const dest = params.get("redirect_url") || "/";
        router.replace(dest);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    })();
  }, [params, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-600">
          <BrainCircuit className="w-5 h-5 text-white" />
        </div>
        {error ? (
          <>
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              onClick={() => router.replace("/signin")}
              className="text-sm text-muted-foreground underline"
            >
              Back to sign in
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Signing you in…</p>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallback />
    </Suspense>
  );
}

"use client";

import { BrainCircuit, LogIn } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignInPage() {
  async function handleGoogleSignIn() {
    const supabase = createSupabaseBrowserClient();
    const dest = "/";
    const redirectTo = `${window.location.origin}/auth/callback?redirect_url=${encodeURIComponent(dest)}`;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-card p-10 shadow-sm w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-600 mb-1">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Interviewer</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogIn className="w-4 h-4" />
          Continue with Google
        </button>

        <p className="text-xs text-muted-foreground">
          By signing in you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}

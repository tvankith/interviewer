"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";


export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, isAuthenticated } = useAuth({enabled: true});

  return (
    <header className="h-16 shrink-0 bg-gray-900 text-white border-b border-gray-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-8">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 hover:opacity-80 transition"
        >
          <img src="/logo.svg" alt="Logo" className="w-8 h-8" />
          <span className="text-lg font-semibold">Interviewer</span>
        </button>

        {isAuthenticated && (
          <nav className="flex items-center gap-1">
          </nav>
        )}
      </div>

      {isAuthenticated && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-semibold">
              {user?.email?.[0]?.toUpperCase() ?? "?"}
            </div>
            <span className="text-sm text-gray-400">{user?.email ?? ""}</span>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}

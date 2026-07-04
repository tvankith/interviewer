"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const menuItems = [
  { name: "Jobs", href: "/jobs" },
  { name: "Profiles", href: "/profiles" },
  { name: "Interviews", href: "/interviews" },
  { name: "Question Bank", href: "/question-bank" },
  { name: "Analytics", href: "/analytics" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth({ enabled: true });

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="h-16 flex items-center px-6 text-lg font-semibold border-b border-gray-800">
        Dashboard
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`block px-4 py-2 rounded-md text-sm transition ${
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-semibold shrink-0">
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <span className="text-xs text-gray-400 truncate">
            {user?.email ?? ""}
          </span>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
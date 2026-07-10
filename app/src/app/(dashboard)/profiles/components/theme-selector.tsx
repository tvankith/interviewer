"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchResumeThemes, type ThemeRecord } from "@/apis/resume-theme";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ThemeSelectorProps {
  selectedId?: string;
  onSelect: (theme: ThemeRecord) => void;
}

export default function ThemeSelector({
  selectedId,
  onSelect,
}: ThemeSelectorProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["resume-themes"],
    queryFn: fetchResumeThemes,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm">Loading themes…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="py-8 text-center text-sm text-red-500">
        Failed to load themes. Please try again.
      </p>
    );
  }

  if (data.items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        No themes available.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {data.items.map((theme) => {
        const isSelected = theme.id === selectedId;
        const { colors, page, fonts } = theme.content ?? {};

        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => onSelect(theme)}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all",
              isSelected
                ? "border-blue-500 shadow-md"
                : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
            )}
          >
            {/* Color swatch preview */}
            <div
              className="flex h-16 w-full items-center gap-1 px-3"
              style={{ backgroundColor: page?.background ?? "#fff", fontFamily: fonts?.heading ?? fonts?.base }}
            >
              {[colors?.text, colors?.muted, colors?.pillBg, colors?.pillBorder]
                .filter(Boolean)
                .map((color, i) => (
                  <span
                    key={i}
                    className="h-6 w-6 rounded-full border border-black/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
            </div>

            {/* Label */}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="truncate text-sm font-medium text-gray-800">
                {theme.name}
              </span>
              <span className="ml-2 shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                v{theme.version}
              </span>
            </div>

            {/* Selected indicator */}
            {isSelected && (
              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3 w-3"
                >
                  <path d="M2 6l3 3 5-5" />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

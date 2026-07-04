"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchResumeTemplates, type Template } from "@/apis/resume-template";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface TemplateSelectorProps {
  selectedId?: string;
  onSelect: (template: Template) => void;
}

export default function TemplateSelector({
  selectedId,
  onSelect,
}: TemplateSelectorProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["resume-templates"],
    queryFn: fetchResumeTemplates,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm">Loading templates…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="py-8 text-center text-sm text-red-500">
        Failed to load templates. Please try again.
      </p>
    );
  }

  if (data.templates.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        No templates available.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {data.templates.map((template) => {
        const isSelected = template.id === selectedId;

        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all",
              isSelected
                ? "border-blue-500 shadow-md"
                : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
            )}
          >
            {/* Thumbnail */}
            <div className="h-36 w-full overflow-hidden bg-gray-50">
              {template.thumbnail_url ? (
                <img
                  src={template.thumbnail_url}
                  alt={template.name}
                  className="h-full w-full object-cover object-top"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-300 text-xs">
                  No preview
                </div>
              )}
            </div>

            {/* Label */}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="truncate text-sm font-medium text-gray-800">
                {template.name}
              </span>
              <span className="ml-2 shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                v{template.version}
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

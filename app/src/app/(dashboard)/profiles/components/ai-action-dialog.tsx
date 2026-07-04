"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIActionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  children: React.ReactNode;
}

const getPriorityStyles = (priority: "high" | "medium" | "low") => {
  switch (priority) {
    case "high":
      return "bg-red-200 text-red-800";
    case "medium":
      return "bg-yellow-200 text-yellow-800";
    case "low":
      return "bg-gray-200 text-gray-800";
  }
};

export function AIActionDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  priority,
  children,
}: AIActionDialogProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange} modal={false}>
      <Dialog.Portal>
        <Dialog.Content
          className={cn(
            "fixed bottom-4 right-4 z-50 w-96 max-h-[600px] flex flex-col rounded-lg shadow-lg border border-gray-200 bg-white",
            "data-state-open:animate-in data-state-closed:animate-out"
          )}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="px-4 pt-4 pb-2 border-b border-gray-100">
            <div className="flex items-start justify-between gap-2 mb-2">
              <Dialog.Title className="text-sm font-semibold text-gray-900">
                {title}
              </Dialog.Title>
              <span
                className={cn(
                  "inline-block text-xs px-2 py-0.5 rounded shrink-0 font-medium",
                  getPriorityStyles(priority)
                )}
              >
                {priority}
              </span>
            </div>
            <Dialog.Description className="text-xs text-gray-600">
              {description}
            </Dialog.Description>
          </div>

          <div className="flex-1 overflow-hidden">{children}</div>

          <Dialog.Close asChild>
            <button
              className="absolute top-3 right-3 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

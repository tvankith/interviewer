"use client";

import { useSyncDraftOnAuth } from "@/hooks/use-sync-draft-on-auth";

export function DraftSync() {
  useSyncDraftOnAuth();
  return null;
}

"use client";

import { useEffect, useRef } from "react";
import { fetchDocumentStatus } from "@/lib/documents-api";
import type { ProcessingStatus } from "@/types";

export interface StatusUpdate {
  id: string;
  status: ProcessingStatus;
  error_msg: string | null;
  progress_msg: string | null;
}

/**
 * Poll `/api/documents/[id]/status` for documents that are still processing.
 *
 * Extracted because the upload page and the library table each hand-rolled an
 * almost identical `setInterval` + `Promise.all` loop with different intervals
 * and different ideas of what to do with the result.
 *
 * `ids` is compared by value (`join(",")`) so callers can pass a fresh array
 * every render without restarting the interval on each keystroke.
 */
export function useDocumentStatusPolling(
  ids: string[],
  onUpdate: (updates: StatusUpdate[]) => void,
  { intervalMs = 2500, enabled = true }: { intervalMs?: number; enabled?: boolean } = {},
): void {
  // Keep the latest callback without making it an effect dependency.
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  const key = ids.slice().sort().join(",");

  useEffect(() => {
    if (!enabled || !key) return;
    const currentIds = key.split(",").filter(Boolean);
    let cancelled = false;

    const tick = async () => {
      const results = await Promise.all(
        currentIds.map(async (id): Promise<StatusUpdate | null> => {
          try {
            const data = await fetchDocumentStatus(id);
            return {
              id,
              status: data.status,
              error_msg: data.error_msg,
              progress_msg: data.progress_msg,
            };
          } catch {
            // Transient failures are ignored; the next tick retries.
            return null;
          }
        }),
      );
      if (cancelled) return;
      const updates = results.filter((r): r is StatusUpdate => r !== null);
      if (updates.length) onUpdateRef.current(updates);
    };

    void tick();
    const timer = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [key, intervalMs, enabled]);
}

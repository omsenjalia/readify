/**
 * Typed browser-side wrappers for the `/api/documents` route handlers.
 *
 * Client components used to hand-roll `fetch(...)` calls in five places with
 * inconsistent error handling (some checked `res.ok`, some did not; some
 * parsed the JSON error body, some threw a generic message). Everything the
 * UI needs now goes through here so failures surface uniformly.
 */

import {
  toProcessingStatus,
  type DocumentWithProgress,
  type ProcessingStatus,
} from "@/types";

/** Shape returned by GET /api/documents/[id]/status. */
export interface DocumentStatus {
  status: ProcessingStatus;
  slug: string;
  error_msg: string | null;
  progress_msg: string | null;
}

export type DocumentPatch = {
  title?: string;
  visibility?: "public" | "private";
  is_favorite?: boolean;
};

/** Thrown for any non-2xx response, carrying the server's message. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : "Network request failed",
      0,
    );
  }

  if (!res.ok) {
    // Route handlers return `{ error }`; fall back to the status text.
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new ApiError(
      body?.error || res.statusText || `Request failed (${res.status})`,
      res.status,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** PATCH title / visibility / favourite. */
export function updateDocument(
  id: string,
  patch: DocumentPatch,
): Promise<DocumentWithProgress> {
  return request<DocumentWithProgress>(`/api/documents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

/** DELETE a document and its stored files. */
export function deleteDocument(id: string): Promise<void> {
  return request<void>(`/api/documents/${id}`, { method: "DELETE" });
}

/**
 * Poll a single document's processing state.
 *
 * `status` is narrowed here because the route handler returns whatever string
 * the database holds, while callers switch on the three-value union.
 */
export async function fetchDocumentStatus(id: string): Promise<DocumentStatus> {
  const raw = await request<
    Omit<DocumentStatus, "status"> & { status: unknown }
  >(`/api/documents/${id}/status`);

  return { ...raw, status: toProcessingStatus(raw.status) };
}

/** Re-queue a document for extraction. Resolves once queued, not when done. */
export function reprocessDocument(
  id: string,
): Promise<{ id: string; slug: string; status: string }> {
  return request(`/api/documents/${id}/reprocess`, { method: "POST" });
}

/* ------------------------------------------------------------------ */
/* Upload                                                              */
/* ------------------------------------------------------------------ */

export type UploadSourceType = "pdf" | "docx" | "youtube" | "txt" | "text";

export interface CreateDocumentBody {
  source_type: UploadSourceType;
  storage_path?: string;
  youtube_url?: string;
  raw_text?: string;
  title?: string;
  /** "markdown" forces Markdown stripping (Pasted Text toggle or .md file). */
  format?: "text" | "markdown";
}

export interface CreatedDocument {
  id: string;
  slug: string;
  status?: ProcessingStatus;
}

export async function createDocument(
  body: CreateDocumentBody,
): Promise<CreatedDocument> {
  const raw = await request<
    Omit<CreatedDocument, "status"> & { status?: unknown }
  >("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return {
    ...raw,
    status:
      raw.status === undefined ? undefined : toProcessingStatus(raw.status),
  };
}

import {
  DEFAULT_READING_MODE,
  READING_MODES,
  type ReadingMode,
} from "@/lib/constants";

/**
 * The reader's display mode (Line Flow vs classic RSVP) is a device-local
 * presentation choice, like the sidebar collapse — it lives in localStorage
 * rather than the `reading_preferences` table so no schema migration is
 * needed and each device can pick its own.
 *
 * Read through `useSyncExternalStore` (see `hooks/useReadingMode`) so the
 * first client render matches the server render.
 */

const STORAGE_KEY = "readio.reader.mode";
const LEGACY_STORAGE_KEY = "readify.reader.mode";

/** Notifies same-tab listeners, since `storage` only fires in other tabs. */
export const READER_MODE_EVENT = "readio:reader-mode";

function normalize(value: unknown): ReadingMode {
  return typeof value === "string" &&
    (READING_MODES as readonly string[]).includes(value)
    ? (value as ReadingMode)
    : DEFAULT_READING_MODE;
}

export function subscribeToReaderMode(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(READER_MODE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(READER_MODE_EVENT, onChange);
  };
}

export function getReaderMode(): ReadingMode {
  try {
    return normalize(
      localStorage.getItem(STORAGE_KEY) ??
        localStorage.getItem(LEGACY_STORAGE_KEY),
    );
  } catch {
    return DEFAULT_READING_MODE;
  }
}

/** Server/initial render always uses the shared default. */
export function serverReaderMode(): ReadingMode {
  return DEFAULT_READING_MODE;
}

export function setReaderMode(mode: ReadingMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, normalize(mode));
  } catch {
    // Private mode / storage disabled: in-memory only for this session.
  }
  window.dispatchEvent(new Event(READER_MODE_EVENT));
}

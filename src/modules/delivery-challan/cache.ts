import { StorageService } from "@/storage";

/**
 * Tiny in-memory TTL cache for slow-changing lookups (company profile,
 * warehouses). Rules:
 *  - Entries are scoped to the logged-in company + user, so a different login
 *    in the same tab (logout is client-side, no reload) never sees them.
 *  - Concurrent callers share one in-flight request.
 *  - Failures are never cached (e.g. a 403 is retried next time).
 *  - Lives only in memory: a page reload starts fresh.
 */
type Entry = { value?: any; expires: number; pending?: Promise<any> };

const store = new Map<string, Entry>();

const readId = (key: string) => {
  try {
    const raw = new StorageService().getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.id ?? parsed?.user_id ?? "";
  } catch {
    return "";
  }
};

const scope = () =>
  `${readId(StorageService.STORAGE_KEYS.COMPANY_DETAILS)}:${readId(StorageService.STORAGE_KEYS.USER_DETAILS)}`;

export async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const fullKey = `${scope()}|${key}`;
  const now = Date.now();
  const hit = store.get(fullKey);
  if (hit?.pending) return hit.pending;
  if (hit && "value" in hit && hit.expires > now) return hit.value as T;

  const pending = fetcher()
    .then((value) => {
      store.set(fullKey, { value, expires: Date.now() + ttlMs });
      return value;
    })
    .catch((err) => {
      store.delete(fullKey);
      throw err;
    });
  store.set(fullKey, { expires: 0, pending });
  return pending;
}

/** Drop entries whose key starts with `prefix` (all entries when omitted). */
export function invalidateCache(prefix?: string) {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const k of [...store.keys()]) {
    if (k.split("|")[1]?.startsWith(prefix)) store.delete(k);
  }
}

export const CACHE_TTL = {
  company: 10 * 60 * 1000,
  warehouses: 5 * 60 * 1000,
};

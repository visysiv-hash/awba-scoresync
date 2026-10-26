// Shared cache for Google Sheets reads.
//
// Each read costs a connector token fetch plus a full spreadsheet round trip
// (300-700ms in practice). These caches live as long as the worker stays warm,
// so repeat lookups (the same player, the same standings table, two components
// asking for the same data) are served instantly, and identical reads that are
// already in flight are de-duplicated instead of hitting Google again.

export const DEFAULT_TTL_MS = 60_000;
export const LIVE_TTL_MS = 30_000;

// A read that stalls or comes back rate-limited gets one retry before the call fails.
const READ_TIMEOUT_MS = 12_000;
const RETRY_DELAY_MS = 400;

const cache = new Map<string, { at: number; body: any }>();
const inflight = new Map<string, Promise<Response>>();

function toResponse(body: any): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

// Returns a Response, so callers keep using res.ok / res.json() exactly as they
// did with a plain fetch. Failed reads are passed straight through and never cached.
export function sheetFetch(url: string, accessToken: string, ttlMs: number = DEFAULT_TTL_MS): Promise<Response> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(toResponse(hit.body));

  const pending = inflight.get(url);
  if (pending) return pending;

  const request = (async () => {
    const read = () =>
      fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(READ_TIMEOUT_MS),
      });

    let res: Response;
    try {
      res = await read();
      if (!res.ok && (res.status === 429 || res.status >= 500)) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        res = await read();
      }
    } catch {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      res = await read();
    }

    if (!res.ok) return res;
    const body = await res.json();
    cache.set(url, { at: Date.now(), body });
    return toResponse(body);
  })();

  inflight.set(url, request);
  const clear = () => inflight.delete(url);
  request.then(clear, clear);
  return request;
}
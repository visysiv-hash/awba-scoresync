// Shared helper for Google Sheets write calls (clear / batch write).
//
// Google occasionally answers with a transient failure (rate limit or a brief
// 5xx). Retrying a couple of times with a short backoff keeps a refresh from
// failing outright because of one bad response.

export async function sheetsRequest(
  url: string,
  accessToken: string,
  init: RequestInit,
  attempts: number = 3
): Promise<Response> {
  let last: Response | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    last = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (last.ok) return last;
    // A 4xx means the request itself is wrong — retrying won't help.
    if (last.status < 500 && last.status !== 429) return last;
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }

  return last as Response;
}